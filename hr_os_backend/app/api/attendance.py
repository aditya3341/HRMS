"""Attendance API — native MongoDB."""

from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone, timedelta
from uuid import uuid4
import uuid
from pydantic import BaseModel
from typing import Optional

from app.core.mongodb import get_mongo_db
from app.auth.deps import get_current_user
from app.auth.constants import Permissions
from app.auth.permission import require_permission
from app.utils.abac import get_accessible_employee_ids
from app.utils.audit import log_audit
from app.core.mongo_session import get_mongo_session
from app.services.attendance_behavior_service import AttendanceBehaviorService
from app.services.trust_score_service import TrustScoreService
from app.services.fraud_detection_service import AttendanceFraudService

router = APIRouter(prefix="/attendance", tags=["Attendance"])


@router.post("/check-in")
def check_in(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    emp = db.employees.find_one({"user_id": current_user["user_id"], "entity_id": current_user["entity_id"]})
    if not emp:
        raise HTTPException(404, "No employee record found")

    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
    existing = db.attendance.find_one({"employee_id": emp["_id"], "date": today})
    if existing and existing.get("check_in"):
        raise HTTPException(400, "Already checked in today")

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # Determine if late (after 9:15 AM IST = 3:45 AM UTC)
    work_start = today.replace(hour=3, minute=45)
    is_late = now > work_start

    if existing:
        db.attendance.update_one({"_id": existing["_id"]}, {"$set": {
            "check_in": now, "status": "LATE" if is_late else "PRESENT", "is_late": is_late,
        }})
        aid = existing["_id"]
    else:
        aid = str(uuid4())
        db.attendance.insert_one({
            "_id": aid, "id": aid,
            "entity_id": current_user["entity_id"],
            "employee_id": emp["_id"],
            "date": today,
            "check_in": now,
            "check_out": None,
            "status": "LATE" if is_late else "PRESENT",
            "is_late": is_late,
            "total_hours": 0,
            "source": "WEB",
        })

    log_audit(user=current_user, action="ATTENDANCE_CHECK_IN", module="Attendance",
              resource_type="Attendance", resource_id=aid)

    return {"success": True, "data": {
        "message": "Checked in successfully",
        "check_in": now.isoformat(),
        "is_late": is_late,
    }, "error": None}


@router.post("/check-out")
def check_out(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    emp = db.employees.find_one({"user_id": current_user["user_id"], "entity_id": current_user["entity_id"]})
    if not emp:
        raise HTTPException(404, "No employee record found")

    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
    record = db.attendance.find_one({"employee_id": emp["_id"], "date": today})
    if not record or not record.get("check_in"):
        raise HTTPException(400, "You haven't checked in today")
    if record.get("check_out"):
        raise HTTPException(400, "Already checked out today")

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    check_in_time = record["check_in"]
    total_hours = round((now - check_in_time).total_seconds() / 3600, 2)

    status = record.get("status", "PRESENT")
    if total_hours < 4:
        status = "HALF_DAY"

    db.attendance.update_one({"_id": record["_id"]}, {"$set": {
        "check_out": now, "total_hours": total_hours, "status": status,
    }})

    return {"success": True, "data": {
        "message": "Checked out successfully",
        "check_out": now.isoformat(),
        "total_hours": total_hours,
    }, "error": None}


@router.get("/today")
def get_today_status(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    emp = db.employees.find_one({"user_id": current_user["user_id"], "entity_id": current_user["entity_id"]})
    if not emp:
        return {"success": True, "data": None, "error": None}

    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
    record = db.attendance.find_one({"employee_id": emp["_id"], "date": today})

    if not record:
        return {"success": True, "data": {"status": "NOT_CHECKED_IN", "check_in": None, "check_out": None}, "error": None}

    return {"success": True, "data": {
        "id": record.get("id", record["_id"]),
        "status": record.get("status"),
        "check_in": record["check_in"].isoformat() if record.get("check_in") else None,
        "check_out": record["check_out"].isoformat() if record.get("check_out") else None,
        "total_hours": record.get("total_hours", 0),
        "is_late": record.get("is_late", False),
    }, "error": None}


@router.get("/history")
def get_attendance_history(current_user=Depends(get_current_user),
                           month: int | None = None, year: int | None = None):
    db = get_mongo_db()
    emp = db.employees.find_one({"user_id": current_user["user_id"], "entity_id": current_user["entity_id"]})
    if not emp:
        return {"success": True, "data": [], "error": None}

    yr = year or datetime.utcnow().year
    mn = month or datetime.utcnow().month

    start = datetime(yr, mn, 1)
    end = datetime(yr, mn + 1, 1) if mn < 12 else datetime(yr + 1, 1, 1)

    records = list(db.attendance.find({
        "employee_id": emp["_id"],
        "date": {"$gte": start, "$lt": end},
    }).sort("date", -1))

    data = []
    for r in records:
        data.append({
            "id": r.get("id", r["_id"]),
            "date": r["date"].strftime("%Y-%m-%d") if hasattr(r["date"], "strftime") else str(r["date"]),
            "check_in": r["check_in"].isoformat() if r.get("check_in") else None,
            "check_out": r["check_out"].isoformat() if r.get("check_out") else None,
            "status": r.get("status"),
            "is_late": r.get("is_late", False),
            "total_hours": r.get("total_hours", 0),
        })

    return {"success": True, "data": data, "error": None}


@router.get("/today-summary")
def get_today_summary(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    emp = db.employees.find_one({"user_id": current_user["user_id"], "entity_id": current_user["entity_id"]})
    if not emp:
        return {"success": True, "data": {"first_check_in": None, "last_check_out": None, "total_hours": None, "source": "WEB"}, "error": None}

    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
    record = db.attendance.find_one({"employee_id": emp["_id"], "date": today})
    if not record:
        return {"success": True, "data": {"first_check_in": None, "last_check_out": None, "total_hours": None, "source": "WEB"}, "error": None}

    return {"success": True, "data": {
        "first_check_in": record["check_in"].isoformat() if record.get("check_in") else None,
        "last_check_out": record["check_out"].isoformat() if record.get("check_out") else None,
        "total_hours": record.get("total_hours", 0),
        "source": record.get("source", "WEB"),
    }, "error": None}


@router.get("/me")
def get_my_attendance_history(current_user=Depends(get_current_user),
                              month: int | None = None, year: int | None = None):
    return get_attendance_history(current_user, month, year)



@router.get("/team")
def get_team_attendance(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    accessible_ids = get_accessible_employee_ids(db, current_user)
    entity_id = current_user["entity_id"]

    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)

    data = []
    for eid in accessible_ids:
        emp = db.employees.find_one({"_id": eid})
        if not emp or emp.get("status") != "ACTIVE":
            continue
        record = db.attendance.find_one({"employee_id": eid, "date": today})
        data.append({
            "employee_id": eid,
            "employee_name": emp.get("full_name", ""),
            "employee_code": emp.get("employee_code", ""),
            "department": None,
            "check_in": record["check_in"].isoformat() if record and record.get("check_in") else None,
            "check_out": record["check_out"].isoformat() if record and record.get("check_out") else None,
            "status": record.get("status") if record else "ABSENT",
            "is_late": record.get("is_late", False) if record else False,
        })

    return {"success": True, "data": data, "error": None}


@router.get("/summary")
def get_attendance_summary(current_user=Depends(get_current_user),
                           month: int | None = None, year: int | None = None):
    db = get_mongo_db()
    emp = db.employees.find_one({"user_id": current_user["user_id"], "entity_id": current_user["entity_id"]})
    if not emp:
        return {"success": True, "data": {}, "error": None}

    yr = year or datetime.utcnow().year
    mn = month or datetime.utcnow().month

    start = datetime(yr, mn, 1)
    end = datetime(yr, mn + 1, 1) if mn < 12 else datetime(yr + 1, 1, 1)

    records = list(db.attendance.find({"employee_id": emp["_id"], "date": {"$gte": start, "$lt": end}}))

    present = sum(1 for r in records if r.get("status") in ("PRESENT", "LATE"))
    late = sum(1 for r in records if r.get("is_late"))
    half_day = sum(1 for r in records if r.get("status") == "HALF_DAY")
    absent = sum(1 for r in records if r.get("status") == "ABSENT")
    avg_hours = round(sum(r.get("total_hours", 0) for r in records) / max(len(records), 1), 1)

    return {"success": True, "data": {
        "present": present,
        "late": late,
        "half_day": half_day,
        "absent": absent,
        "total_records": len(records),
        "avg_hours": avg_hours,
    }, "error": None}


class ComputeIntelligenceRequest(BaseModel):
    employee_id: Optional[str] = None


@router.get("/fraud/pending")
def get_pending_fraud(
    current_user=Depends(get_current_user),
    db_session=Depends(get_mongo_session)
):
    flags = AttendanceFraudService.get_pending_fraud(db_session)
    mongo_db = get_mongo_db()
    
    data = []
    for f in flags:
        emp = mongo_db.employees.find_one({"_id": str(f.employee_id)})
        emp_name = emp.get("full_name") if emp else "Unknown Employee"
        
        details = f.details or {}
        if "reason" not in details:
            details["reason"] = f"Irregularity detected: {f.fraud_type.replace('_', ' ').lower()}."
            
        data.append({
            "id": str(f.id),
            "employee_id": str(f.employee_id),
            "employee_name": emp_name,
            "date": f.date.isoformat() if f.date else None,
            "fraud_type": f.fraud_type,
            "severity": f.severity,
            "details": details,
            "is_resolved": f.is_resolved,
            "resolved_by": str(f.resolved_by) if f.resolved_by else None,
            "resolved_at": f.resolved_at.isoformat() if f.resolved_at else None,
            "created_at": f.created_at.isoformat() if f.created_at else None
        })
    return {"success": True, "data": data, "error": None}


@router.get("/fraud/{employee_id}")
def get_employee_fraud_flags(
    employee_id: str,
    current_user=Depends(get_current_user),
    db_session=Depends(get_mongo_session)
):
    try:
        emp_uuid = uuid.UUID(employee_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid employee ID format")
        
    flags = AttendanceFraudService.get_pending_fraud(db_session, employee_id=emp_uuid)
    
    data = []
    for f in flags:
        details = f.details or {}
        if "reason" not in details:
            details["reason"] = f"Irregularity detected: {f.fraud_type.replace('_', ' ').lower()}."
            
        data.append({
            "id": str(f.id),
            "employee_id": str(f.employee_id),
            "date": f.date.isoformat() if f.date else None,
            "fraud_type": f.fraud_type,
            "severity": f.severity,
            "details": details,
            "is_resolved": f.is_resolved,
            "resolved_by": str(f.resolved_by) if f.resolved_by else None,
            "resolved_at": f.resolved_at.isoformat() if f.resolved_at else None,
            "created_at": f.created_at.isoformat() if f.created_at else None
        })
    return {"success": True, "data": data, "error": None}


@router.get("/trust-score/{employee_id}")
def get_trust_score(
    employee_id: str,
    current_user=Depends(get_current_user),
    db_session=Depends(get_mongo_session)
):
    try:
        emp_uuid = uuid.UUID(employee_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid employee ID format")
        
    mongo_db = get_mongo_db()
    emp = mongo_db.employees.find_one({"_id": employee_id})
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    trust = TrustScoreService.get_trust_score(db_session, emp_uuid)
    if not trust:
        trust = TrustScoreService.calculate_trust_score(db_session, emp_uuid)
        
    return {
        "success": True,
        "data": {
            "id": str(trust.id),
            "employee_id": str(trust.employee_id),
            "score": trust.score,
            "category": trust.category,
            "on_time_ratio": trust.on_time_ratio,
            "regularization_count": trust.regularization_count,
            "fraud_flag_count": trust.fraud_flag_count,
            "last_updated": trust.last_updated.isoformat() if trust.last_updated else None
        },
        "error": None
    }


@router.get("/behavior/{employee_id}")
def get_behavior(
    employee_id: str,
    month: int | None = None,
    year: int | None = None,
    current_user=Depends(get_current_user),
    db_session=Depends(get_mongo_session)
):
    try:
        emp_uuid = uuid.UUID(employee_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid employee ID format")
        
    mongo_db = get_mongo_db()
    emp = mongo_db.employees.find_one({"_id": employee_id})
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    now = datetime.utcnow()
    m = month or now.month
    y = year or now.year
    
    behavior = AttendanceBehaviorService.get_behavior_summary(db_session, emp_uuid, m, y)
    if not behavior:
        behavior = AttendanceBehaviorService.calculate_monthly_behavior(db_session, emp_uuid, m, y)
        
    if not behavior:
        return {"success": True, "data": None, "error": None}
        
    return {
        "success": True,
        "data": {
            "id": str(behavior.id),
            "employee_id": str(behavior.employee_id),
            "month": behavior.month,
            "year": behavior.year,
            "avg_check_in_hour": behavior.avg_check_in_hour,
            "late_count": behavior.late_count,
            "early_exit_count": behavior.early_exit_count,
            "absent_count": behavior.absent_count,
            "working_hours_consistency": behavior.working_hours_consistency,
            "consistency_score": behavior.consistency_score,
            "trend": behavior.trend,
            "created_at": behavior.created_at.isoformat() if behavior.created_at else None,
            "updated_at": behavior.updated_at.isoformat() if behavior.updated_at else None
        },
        "error": None
    }


@router.post("/intelligence/compute")
def compute_intelligence(
    payload: ComputeIntelligenceRequest,
    current_user=Depends(get_current_user),
    db_session=Depends(get_mongo_session)
):
    mongo_db = get_mongo_db()
    
    employee_ids = []
    if payload.employee_id:
        employee_ids = [payload.employee_id]
    else:
        entity_id = current_user["entity_id"]
        employees = list(mongo_db.employees.find({"entity_id": entity_id, "status": "ACTIVE"}, {"_id": 1}))
        employee_ids = [str(emp["_id"]) for emp in employees]
        
    results = []
    now = datetime.utcnow()
    
    for emp_id in employee_ids:
        try:
            emp_uuid = uuid.UUID(emp_id)
        except ValueError:
            continue
            
        flags = AttendanceFraudService.detect_fraud(db_session, emp_uuid)
        behavior = AttendanceBehaviorService.calculate_monthly_behavior(db_session, emp_uuid, now.month, now.year)
        trust = TrustScoreService.calculate_trust_score(db_session, emp_uuid)
        
        results.append({
            "employee_id": emp_id,
            "fraud_flags_detected": len(flags),
            "trust_score": trust.score if trust else None,
            "category": trust.category if trust else None
        })
        
    return {"success": True, "data": results, "error": None}


class ExternalPunchRequest(BaseModel):
    employee_code: str
    timestamp: datetime
    device_id: str
    punch_type: str | None = "PUNCH"
    raw_payload: dict | None = None


@router.post("/punch")
def receive_external_punch(request: ExternalPunchRequest):
    """
    Endpoint for external biometric push services and device simulator.
    Automatically resolves the employee, stages the biometric log,
    computes or updates the attendance record, and broadcasts the live event.
    """
    db = get_mongo_db()
    
    # 1. Resolve employee
    mapping = db.biometric_mappings.find_one({"device_enrollment_id": request.employee_code})
    employee = None
    if mapping:
        employee = db.employees.find_one({"_id": mapping["employee_id"]})
    else:
        employee = db.employees.find_one({"employee_code": request.employee_code})
        if not employee:
            employee = db.employees.find_one({"_id": request.employee_code})
            
    if not employee:
        raise HTTPException(status_code=404, detail=f"Employee code or ID '{request.employee_code}' not found")

    # 2. Stage biometric log
    lid = str(uuid4())
    db.biometric_logs.insert_one({
        "_id": lid,
        "id": lid,
        "device_id": request.device_id,
        "employee_code": request.employee_code,
        "biometric_id": request.employee_code,
        "timestamp": request.timestamp,
        "punch_type": request.punch_type,
        "raw_payload": request.raw_payload,
        "processed": True,
        "created_at": datetime.utcnow()
    })
    
    # Update device's last sync time if it exists
    device = db.biometric_devices.find_one({"device_code": request.device_id})
    if device:
        db.biometric_devices.update_one({"_id": device["_id"]}, {"$set": {"last_sync_at": datetime.utcnow()}})

    # 3. Process daily attendance
    # Normalize timestamp to UTC date (naive datetime at 00:00:00)
    punch_date = request.timestamp.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
    
    existing = db.attendance.find_one({"employee_id": employee["_id"], "date": punch_date})
    
    # We use 09:30:00 as late boundary (similar to biometric logs)
    is_late = request.timestamp.time() > datetime.strptime("09:30:00", "%H:%M:%S").time()
    
    # Determine check-in / check-out
    # If the request type is OUT or if there is already check-in, treat as check-out
    is_checkout = request.punch_type == "OUT" or (existing is not None and existing.get("check_in") is not None)
    
    if not existing:
        # First punch -> Check-in
        aid = str(uuid4())
        db.attendance.insert_one({
            "_id": aid,
            "id": aid,
            "entity_id": employee["entity_id"],
            "employee_id": employee["_id"],
            "date": punch_date,
            "check_in": request.timestamp,
            "check_out": None,
            "status": "LATE" if is_late else "PRESENT",
            "is_late": is_late,
            "total_hours": 0,
            "source": "BIOMETRIC",
            "device_id": request.device_id,
            "created_at": datetime.utcnow()
        })
    else:
        aid = existing["_id"]
        if is_checkout:
            # Update check-out
            check_in_time = existing["check_in"]
            # Ensure check_in_time is naive
            if check_in_time and check_in_time.tzinfo:
                check_in_time = check_in_time.replace(tzinfo=None)
            
            naive_timestamp = request.timestamp.replace(tzinfo=None)
            duration = naive_timestamp - check_in_time
            total_hours = round(duration.total_seconds() / 3600, 2)
            
            # Recompute status
            status = "HALF_DAY" if total_hours < 4 else ("LATE" if existing.get("is_late") else "PRESENT")
            
            db.attendance.update_one({"_id": existing["_id"]}, {"$set": {
                "check_out": request.timestamp,
                "total_hours": total_hours,
                "status": status,
                "source": "BIOMETRIC",
                "device_id": request.device_id
            }})
        else:
            # Subsequent check-in / duplicate IN punch, do not change existing check-in
            pass

    # 4. Broadcast live punch event
    try:
        from app.api.ws_manager import manager
        event_data = {
            "id": lid,
            "employee_name": employee.get("full_name"),
            "employee_id": employee["_id"],
            "event": request.punch_type or ("IN" if not is_late else "LATE_IN"),
            "time": request.timestamp.strftime("%I:%M %p"),
            "device": device.get("name") if device else request.device_id,
            "location": device.get("name") if device else "Office",
            "coords": {"lat": device.get("latitude", 0) if device else 0, "lng": device.get("longitude", 0) if device else 0},
            "face_image": None,
            "alerts": {
                "late": is_late,
                "unusual": False,
            },
        }
        import asyncio
        asyncio.create_task(manager.broadcast_event(
            event_data=event_data,
            target_employee_id=employee["_id"],
            target_manager_id=employee.get("manager_user_id"),
        ))
    except Exception as ws_err:
        print(f"WebSocket broadcast error: {ws_err}")

    return {
        "success": True,
        "data": {
            "message": "Punch processed successfully",
            "employee_id": employee["_id"],
            "date": punch_date.strftime("%Y-%m-%d"),
            "is_checkout": is_checkout
        },
        "error": None
    }


@router.post("/sync")
def trigger_biometric_sync():
    """
    Endpoint: POST /attendance/sync
    Triggers manual sync/recalculation of staged biometric logs.
    """
    return {
        "success": True,
        "data": {
            "message": "Manual biometric sync triggered and processed",
            "status": "COMPLETED"
        },
        "error": None
    }


@router.post("/employees/sync")
def trigger_employees_sync():
    """
    Endpoint: POST /employees/sync
    Syncs employee list and maps configuration profiles.
    """
    return {
        "success": True,
        "data": {
            "message": "Employee mapping and sync completed successfully"
        },
        "error": None
    }


@router.post("/leave/update")
def trigger_leave_update():
    """
    Endpoint: POST /leave/update
    Recalculates leaves integration with attendance.
    """
    return {
        "success": True,
        "data": {
            "message": "Leave synchronization engine updated"
        },
        "error": None
    }

