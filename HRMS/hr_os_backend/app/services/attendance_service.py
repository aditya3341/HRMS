import uuid
import os
import base64
import math
from typing import List, Optional, Tuple
from datetime import datetime, date, time, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc

from app.models.attendance import Attendance, AttendanceRegularization
from app.models.employee import Employee
from app.models.system_config import SystemConfig
from app.models.enums import AttendanceStatus
from app.utils.audit import log_audit

SELFIE_UPLOAD_DIR = "uploads/selfies"

# ─── Geo Utils ────────────────────────────────────────────────────────────────

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in meters between two GPS coordinates."""
    R = 6_371_000  # Earth's radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def find_nearest_location(lat: float, lng: float, allowed_locations: list, radius: float):
    """Returns (location_name, distance_m, is_within_radius)."""
    closest_name = None
    closest_dist = float("inf")
    for loc in allowed_locations:
        dist = haversine_distance(lat, lng, loc["lat"], loc["lng"])
        if dist < closest_dist:
            closest_dist = dist
            closest_name = loc.get("name", "Office")
    return closest_name, closest_dist, closest_dist <= radius


# ─── Config Loader ────────────────────────────────────────────────────────────

def get_attendance_security_config(db: Session) -> dict:
    default = {
        "geo_fencing_enabled": False,
        "selfie_required": False,
        "allowed_radius_meters": 200,
        "allowed_locations": [],
        "enforced_roles": [],
        "enforced_employee_ids": [],
        "allow_manual_override": True,
    }
    config = db.query(SystemConfig).filter(
        SystemConfig.config_key == "ATTENDANCE_SECURITY_CONFIG",
        SystemConfig.is_active == True
    ).first()
    if config and config.config_value:
        return {**default, **config.config_value}
    return default


def get_regularization_config(db: Session) -> dict:
    default = {
        "reasons": ["Missed Punch", "System Error", "Work From Home", "Client Visit", "Other"],
        "require_comment_if_other": True,
    }
    config = db.query(SystemConfig).filter(
        SystemConfig.config_key == "ATTENDANCE_REGULARIZATION_CONFIG",
        SystemConfig.is_active == True
    ).first()
    if config and config.config_value:
        return {**default, **config.config_value}
    return default


# ─── Selfie Storage ───────────────────────────────────────────────────────────

def save_selfie(employee_id: uuid.UUID, selfie_b64: str) -> str:
    """Decodes base64 selfie and saves to local filesystem. Returns relative URL."""
    os.makedirs(SELFIE_UPLOAD_DIR, exist_ok=True)
    filename = f"{employee_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.jpg"
    filepath = os.path.join(SELFIE_UPLOAD_DIR, filename)
    # Strip data URL prefix if present
    if "," in selfie_b64:
        selfie_b64 = selfie_b64.split(",", 1)[1]
    with open(filepath, "wb") as f:
        f.write(base64.b64decode(selfie_b64))
    return f"/{SELFIE_UPLOAD_DIR}/{filename}"


# ─── Attendance Service ───────────────────────────────────────────────────────

class AttendanceService:

    @staticmethod
    def get_employee_by_user_id(db: Session, user_id: uuid.UUID):
        return db.query(Employee).filter(Employee.user_id == user_id).first()

    @staticmethod
    def check_in(
        db: Session,
        user_id: uuid.UUID,
        entity_id: uuid.UUID,
        ip_address: str,
        device_info: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        selfie_b64: Optional[str] = None,
        device_id: Optional[str] = None,
    ):
        employee = AttendanceService.get_employee_by_user_id(db, user_id)
        if not employee:
            return None, "Employee record not found for user"

        return AttendanceService.check_in_by_employee(
            db=db,
            employee=employee,
            entity_id=entity_id,
            timestamp=datetime.now(),
            ip_address=ip_address,
            device_info=device_info,
            latitude=latitude,
            longitude=longitude,
            selfie_b64=selfie_b64,
            device_id=device_id,
            user_id_for_audit=user_id,
        )

    @staticmethod
    def check_in_by_employee(
        db: Session,
        employee: Employee,
        entity_id: uuid.UUID,
        timestamp: datetime,
        ip_address: str = "0.0.0.0",
        device_info: str = "SYSTEM/BIOMETRIC",
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        selfie_b64: Optional[str] = None,
        device_id: Optional[str] = None,
        user_id_for_audit: Optional[uuid.UUID] = None,
    ):
        today = timestamp.date()

        existing = db.query(Attendance).filter(
            Attendance.employee_id == employee.id,
            Attendance.date == today
        ).first()

        if existing and existing.check_in:
            return existing, "Already checked in today"

        # ─── Security Config Validation ────────────────────────────────────
        security_cfg = get_attendance_security_config(db)

        # Get the user's role from the linked User record (Employee has no role column)
        user_role = None
        if employee.user_id:
            from app.models.user import User
            user_obj = db.query(User).filter(User.id == employee.user_id).first()
            user_role = getattr(user_obj, "role", None)

        is_enforced = (
            (user_role in security_cfg.get("enforced_roles", []))
            or (str(employee.id) in security_cfg.get("enforced_employee_ids", []))
        )

        verification_status = "MANUAL"
        location_name = None

        if security_cfg.get("geo_fencing_enabled") and is_enforced:
            if latitude is None or longitude is None:
                if not security_cfg.get("allow_manual_override"):
                    return None, "Location is required for check-in at your role."
                verification_status = "MANUAL"
            else:
                allowed_locs = security_cfg.get("allowed_locations", [])
                radius = security_cfg.get("allowed_radius_meters", 200)
                loc_name, distance, within = find_nearest_location(latitude, longitude, allowed_locs, radius)
                location_name = loc_name
                if within:
                    verification_status = "VERIFIED"
                elif not security_cfg.get("allow_manual_override"):
                    return None, f"You are {int(distance)}m away from the allowed location ({loc_name}). Check-in blocked."
                else:
                    verification_status = "FAILED"  # Outside but override allowed

        # ─── Selfie ────────────────────────────────────────────────────────
        selfie_url = None
        if selfie_b64:
            try:
                selfie_url = save_selfie(employee.id, selfie_b64)
            except Exception:
                pass  # Don't block check-in on selfie save failure

        # ─── Late Detection ────────────────────────────────────────────────
        late_cutoff = time(9, 30)
        is_late = timestamp.time() > late_cutoff

        if not existing:
            existing = Attendance(
                employee_id=employee.id,
                entity_id=entity_id,
                date=today,
            )
            db.add(existing)

        existing.check_in = timestamp
        existing.ip_address = ip_address
        existing.device_info = device_info
        existing.device_id = device_id
        existing.latitude = latitude
        existing.longitude = longitude
        existing.location_name = location_name
        existing.selfie_url = selfie_url
        existing.verification_status = verification_status
        existing.is_late = is_late
        existing.status = AttendanceStatus.LATE if is_late else AttendanceStatus.PRESENT

        db.commit()
        db.refresh(existing)

        if user_id_for_audit or employee.user_id:
            log_audit(
                db=db,
                user_id=user_id_for_audit or employee.user_id,
                action="ATTENDANCE_CHECK_IN",
                module="ATTENDANCE",
                resource_id=existing.id,
                new_values={
                    "check_in": timestamp.isoformat(),
                    "is_late": is_late,
                    "verification_status": verification_status,
                    "location_name": location_name,
                }
            )

        return existing, None

    @staticmethod
    def check_out(db: Session, user_id: uuid.UUID):
        employee = AttendanceService.get_employee_by_user_id(db, user_id)
        if not employee:
            return None, "Employee record not found"

        return AttendanceService.check_out_by_employee(
            db=db,
            employee=employee,
            timestamp=datetime.now(),
            user_id_for_audit=user_id,
        )

    @staticmethod
    def check_out_by_employee(
        db: Session,
        employee: Employee,
        timestamp: datetime,
        user_id_for_audit: Optional[uuid.UUID] = None,
    ):
        today = timestamp.date()
        attendance = db.query(Attendance).filter(
            Attendance.employee_id == employee.id,
            Attendance.date == today
        ).first()

        if not attendance:
            return None, "No check-in record found for today"

        if attendance.check_out:
            return attendance, "Already checked out today"

        attendance.check_out = timestamp

        duration = timestamp - attendance.check_in
        total_hours = duration.total_seconds() / 3600
        attendance.total_hours = round(total_hours, 2)

        if total_hours >= 8:
            attendance.status = AttendanceStatus.LATE if attendance.is_late else AttendanceStatus.PRESENT
        elif total_hours >= 4:
            attendance.status = AttendanceStatus.HALF_DAY
        else:
            attendance.status = AttendanceStatus.HALF_DAY

        db.commit()
        db.refresh(attendance)

        if user_id_for_audit or employee.user_id:
            log_audit(
                db=db,
                user_id=user_id_for_audit or employee.user_id,
                action="ATTENDANCE_CHECK_OUT",
                module="ATTENDANCE",
                resource_id=attendance.id,
                new_values={
                    "check_out": timestamp.isoformat(),
                    "total_hours": attendance.total_hours,
                    "status": attendance.status,
                }
            )

        return attendance, None

    @staticmethod
    def get_my_attendance(db: Session, user_id: uuid.UUID, month: int, year: int):
        employee = AttendanceService.get_employee_by_user_id(db, user_id)
        if not employee:
            return []

        start_date = date(year, month, 1)
        end_date = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)

        return db.query(Attendance).filter(
            Attendance.employee_id == employee.id,
            Attendance.date >= start_date,
            Attendance.date < end_date,
        ).order_by(Attendance.date.desc()).all()

    @staticmethod
    def get_team_attendance(db: Session, manager_employee_id: uuid.UUID):
        subordinates = db.query(Employee.id).filter(Employee.manager_id == manager_employee_id).all()
        sub_ids = [s[0] for s in subordinates]
        today = date.today()
        return (
            db.query(Attendance, Employee.full_name)
            .join(Employee, Attendance.employee_id == Employee.id)
            .filter(
                Attendance.employee_id.in_(sub_ids),
                Attendance.date == today,
            )
            .all()
        )

    @staticmethod
    def get_late_alerts(db: Session, entity_id: uuid.UUID):
        seven_days_ago = date.today() - timedelta(days=7)

        late_counts = (
            db.query(Attendance.employee_id, func.count(Attendance.id).label("late_count"))
            .filter(
                Attendance.entity_id == entity_id,
                Attendance.date >= seven_days_ago,
                Attendance.is_late == True,
            )
            .group_by(Attendance.employee_id)
            .having(func.count(Attendance.id) >= 3)
            .subquery()
        )

        results = (
            db.query(Employee.full_name, late_counts.c.late_count)
            .join(late_counts, Employee.id == late_counts.c.employee_id)
            .all()
        )

        return [{"name": r[0], "late_count": r[1]} for r in results]

    @staticmethod
    def get_monthly_summary(db: Session, user_id: uuid.UUID, month: int, year: int):
        employee = AttendanceService.get_employee_by_user_id(db, user_id)
        if not employee:
            return None

        start_date = date(year, month, 1)
        end_date = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)

        records = db.query(Attendance).filter(
            Attendance.employee_id == employee.id,
            Attendance.date >= start_date,
            Attendance.date < end_date,
        ).all()

        summary = {"present": 0, "late": 0, "half_day": 0, "absent": 0, "total_hours": 0.0}
        for r in records:
            if r.status == AttendanceStatus.PRESENT:
                summary["present"] += 1
            elif r.status == AttendanceStatus.LATE:
                summary["late"] += 1
            elif r.status == AttendanceStatus.HALF_DAY:
                summary["half_day"] += 1
            elif r.status == AttendanceStatus.ABSENT:
                summary["absent"] += 1
            if r.total_hours:
                summary["total_hours"] += r.total_hours

        summary["total_hours"] = round(summary["total_hours"], 2)
        return summary

    @staticmethod
    def get_all_attendance(
        db: Session,
        entity_id: uuid.UUID,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        department_id: Optional[uuid.UUID] = None,
        employee_id: Optional[uuid.UUID] = None,
    ):
        query = (
            db.query(Attendance, Employee.full_name, Employee.department_id)
            .join(Employee, Attendance.employee_id == Employee.id)
            .filter(Attendance.entity_id == entity_id)
        )

        if start_date:
            query = query.filter(Attendance.date >= start_date)
        if end_date:
            query = query.filter(Attendance.date <= end_date)
        if department_id:
            query = query.filter(Employee.department_id == department_id)
        if employee_id:
            query = query.filter(Attendance.employee_id == employee_id)

        return query.order_by(Attendance.date.desc()).all()

    # ─── Regularization ────────────────────────────────────────────────────

    @staticmethod
    def submit_regularization(
        db: Session,
        user_id: uuid.UUID,
        attendance_id: uuid.UUID,
        reason: str,
        comment: Optional[str] = None,
    ):
        employee = AttendanceService.get_employee_by_user_id(db, user_id)
        if not employee:
            return None, "Employee record not found"

        reg_cfg = get_regularization_config(db)
        if reg_cfg.get("require_comment_if_other") and reason == "Other" and not comment:
            return None, "Comment is required when reason is 'Other'."

        attendance = db.query(Attendance).filter(
            Attendance.id == attendance_id,
            Attendance.employee_id == employee.id,
        ).first()
        if not attendance:
            return None, "Attendance record not found or does not belong to you."

        # Prevent duplicate pending requests for same attendance
        existing_reg = db.query(AttendanceRegularization).filter(
            AttendanceRegularization.attendance_id == attendance_id,
            AttendanceRegularization.status == "PENDING",
        ).first()
        if existing_reg:
            return None, "A pending regularization request already exists for this record."

        reg = AttendanceRegularization(
            attendance_id=attendance_id,
            employee_id=employee.id,
            reason=reason,
            comment=comment,
            status="PENDING",
        )
        db.add(reg)
        db.commit()
        db.refresh(reg)
        return reg, None

    @staticmethod
    def get_my_regularizations(db: Session, user_id: uuid.UUID):
        employee = AttendanceService.get_employee_by_user_id(db, user_id)
        if not employee:
            return []
        return (
            db.query(AttendanceRegularization)
            .filter(AttendanceRegularization.employee_id == employee.id)
            .order_by(AttendanceRegularization.created_at.desc())
            .all()
        )

    @staticmethod
    def get_pending_regularizations(db: Session, entity_id: uuid.UUID):
        return (
            db.query(AttendanceRegularization, Employee.full_name)
            .join(Employee, AttendanceRegularization.employee_id == Employee.id)
            .filter(
                Employee.entity_id == entity_id,
                AttendanceRegularization.status == "PENDING",
            )
            .order_by(AttendanceRegularization.created_at.asc())
            .all()
        )

    @staticmethod
    def action_regularization(
        db: Session,
        reg_id: uuid.UUID,
        approver_user_id: uuid.UUID,
        action: str,  # APPROVED / REJECTED
    ):
        approver = AttendanceService.get_employee_by_user_id(db, approver_user_id)
        reg = db.query(AttendanceRegularization).filter(
            AttendanceRegularization.id == reg_id
        ).first()
        if not reg:
            return None, "Regularization not found"
        if reg.status != "PENDING":
            return None, "Request is no longer pending"

        reg.status = action
        reg.approved_by = approver.id if approver else None
        reg.approved_at = datetime.utcnow()
        db.commit()
        db.refresh(reg)
        return reg, None

    @staticmethod
    def run_daily_sync(db: Session, sync_date: Optional[date] = None):
        sync_date = sync_date or (date.today() - timedelta(days=1))
        employees = db.query(Employee).filter(Employee.status == "ACTIVE").all()
        for emp in employees:
            record = db.query(Attendance).filter(
                Attendance.employee_id == emp.id,
                Attendance.date == sync_date,
            ).first()
            if not record:
                record = Attendance(
                    employee_id=emp.id,
                    entity_id=emp.entity_id,
                    date=sync_date,
                    status=AttendanceStatus.ABSENT,
                    total_hours=0.0,
                )
                db.add(record)
            elif not record.check_in:
                record.status = AttendanceStatus.ABSENT
                record.total_hours = 0.0
        db.commit()
        return True
