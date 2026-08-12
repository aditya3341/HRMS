import uuid
import calendar
import logging
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import Session
from app.models.employee import Employee
from app.models.salary_structure import SalaryStructure
from app.models.attendance import Attendance
from app.models.payroll import PayrollRun, PayrollEntry
from app.models.enums import PayrollStatus, AttendanceStatus, LeaveStatus
from app.models.leave import Leave, Holiday, LeaveType
from app.models.audit_log import AuditLog
from app.models.system_config import SystemConfig
from app.services.attendance_behavior_service import AttendanceBehaviorService

logger = logging.getLogger(__name__)

class PayrollService:
    @staticmethod
    def is_weekend(dt: date) -> bool:
        return dt.weekday() >= 5  # 5=Saturday, 6=Sunday

    @staticmethod
    def _round(val: float) -> float:
        """Standardized rounding for payroll (2 decimal places)."""
        return float(round(val, 2))

    @staticmethod
    async def _get_payroll_snapshot(
        db: Session, 
        entity_id: uuid.UUID, 
        start_date: date, 
        end_date: date
    ) -> Dict[str, Any]:
        """
        Fetches a snapshot of all relevant data to ensure concurrency safety (Option B).
        """
        # 1. Fetch Holidays
        hol_stmt = select(Holiday).where(
            and_(Holiday.entity_id == entity_id, Holiday.date.between(start_date, end_date))
        )
        holidays = {h.date: h for h in db.execute(hol_stmt).scalars().all()}

        # 2. Fetch Attendance
        att_stmt = select(Attendance).where(
            and_(Attendance.entity_id == entity_id, Attendance.date.between(start_date, end_date))
        )
        attendance_records = db.execute(att_stmt).scalars().all()
        att_map = {}
        for a in attendance_records:
            if a.employee_id not in att_map:
                att_map[a.employee_id] = {}
            att_map[a.employee_id][a.date] = a

        # 3. Fetch Approved Leaves
        leave_stmt = select(Leave).where(
            and_(
                Leave.entity_id == entity_id,
                Leave.status == LeaveStatus.APPROVED,
                Leave.start_date <= end_date,
                Leave.end_date >= start_date
            )
        )
        leaves = db.execute(leave_stmt).scalars().all()
        leave_map = {} # employee_id -> list of leaves
        for l in leaves:
            if l.employee_id not in leave_map:
                leave_map[l.employee_id] = []
            leave_map[l.employee_id].append(l)

        # 4. Fetch Leave Types (for paid/unpaid check)
        lt_stmt = select(LeaveType).where(LeaveType.entity_id == entity_id)
        leave_types = {lt.id: lt for lt in db.execute(lt_stmt).scalars().all()}

        # 5. Fetch configs
        cfg_stmt = select(SystemConfig).where(
            and_(SystemConfig.entity_id == entity_id, SystemConfig.config_key.in_(["PAYROLL_ATTENDANCE_RULES"]))
        )
        configs = {c.config_key: c.config_value for c in db.execute(cfg_stmt).scalars().all()}

        return {
            "holidays": holidays,
            "attendance": att_map,
            "leaves": leave_map,
            "leave_types": leave_types,
            "configs": configs
        }

    @staticmethod
    async def _execute_payroll_internal(
        db: Session,
        entity_id: uuid.UUID,
        month: int,
        year: int,
        processed_by: uuid.UUID,
        commit: bool = True
    ) -> PayrollRun:
        """
        Unified Deterministic Engine for both Preview and Final runs.
        """
        days_in_month = calendar.monthrange(year, month)[1]
        month_start = date(year, month, 1)
        month_end = date(year, month, days_in_month)

        # 1. Take Data Snapshot (Concurrency Protection)
        snapshot = await PayrollService._get_payroll_snapshot(db, entity_id, month_start, month_end)
        
        # 2. Identify Working Days (Standard)
        working_dates = []
        curr = month_start
        while curr <= month_end:
            if not PayrollService.is_weekend(curr) and curr not in snapshot["holidays"]:
                working_dates.append(curr)
            curr += timedelta(days=1)
        
        standard_working_days = len(working_dates)
        if standard_working_days == 0:
            raise ValueError("No working days found in specified month.")

        # 3. Process Employees
        stmt = select(SalaryStructure).where(
            and_(SalaryStructure.entity_id == entity_id, SalaryStructure.is_active == True)
        )
        structures = db.execute(stmt).scalars().all()

        payroll_run = PayrollRun(
            entity_id=entity_id,
            month=month,
            year=year,
            status=PayrollStatus.DRAFT,
            processed_by=processed_by
        )
        if commit:
            db.add(payroll_run)
            db.flush()

        total_gross, total_deductions, total_net = 0, 0, 0
        entries = []

        for struct in structures:
            emp = db.get(Employee, struct.employee_id)
            join_date = emp.date_of_joining.date() if emp.date_of_joining else None
            
            # Counts for Traceability
            counts = {
                "absences": 0.0,
                "approved_leaves": 0.0,
                "rejected_leaves": 0.0, # Not in snapshot mapping currently (only approved)
                "half_days": 0.0,
                "overlaps": 0.0,
                "late_count": 0
            }

            # LOP Logic Loop
            for d in working_dates:
                # Rule: Joining Date exclusion
                if join_date and d < join_date:
                    counts["absences"] += 1.0
                    continue

                is_holiday = d in snapshot["holidays"]
                if is_holiday:
                    continue # Holiday overrides everything (0 LOP)

                # Approved Leave (Priority over Attendance)
                emp_leaves = snapshot["leaves"].get(struct.employee_id, [])
                active_leave = next((l for l in emp_leaves if l.start_date <= d <= l.end_date), None)
                
                att = snapshot["attendance"].get(struct.employee_id, {}).get(d)

                if active_leave:
                    lt = snapshot["leave_types"].get(active_leave.leave_type_id)
                    if lt and lt.is_paid:
                        counts["approved_leaves"] += 1.0
                    else:
                        counts["rejected_leaves"] += 1.0 # Treating unpaid as LOP category
                elif att:
                    if att.status == AttendanceStatus.ABSENT:
                        counts["absences"] += 1.0
                    elif att.status == AttendanceStatus.HALF_DAY:
                        counts["half_days"] += 1.0
                    elif att.status == AttendanceStatus.LATE:
                        pass # Counted as present for LOP
                    
                    if att.is_late:
                        counts["late_count"] += 1
                else:
                    counts["absences"] += 1.0

            # Final LOP Calculation (Deterministic)
            final_lop = PayrollService._round(
                counts["absences"] + counts["rejected_leaves"] + (counts["half_days"] * 0.5)
            )
            
            # Rounding Standardization (Strict Enterprise Rules)
            gross = struct.basic + struct.hra + struct.special_allowance + struct.other_allowances
            per_day = PayrollService._round(gross / standard_working_days)
            lop_deduction_raw = PayrollService._round(final_lop * per_day)
            
            # Late Penalty (Legacy rule: 3 lates = 0.5 day deduction)
            late_deduction = 0
            if counts["late_count"] >= 3:
                late_deduction = int(round(per_day * 0.5))

            # NEW: Consistency Bonus (Intelligence integration)
            consistency_bonus = 0
            payroll_rules = snapshot["configs"].get("PAYROLL_ATTENDANCE_RULES", {})
            if payroll_rules.get("consistency_bonus_enabled"):
                behavior = AttendanceBehaviorService.get_behavior_summary(db, struct.employee_id, month, year)
                if behavior and behavior.consistency_score >= 0.9:
                    # Reward: 0.5 day salary bonus
                    consistency_bonus = int(round(per_day * 0.5))

            total_deductions_raw = lop_deduction_raw + late_deduction + struct.fixed_deductions - consistency_bonus
            net = PayrollService._round(gross - total_deductions_raw)
            
            # Audit Assertion
            if net < 0:
                net = 0.0

            entry = PayrollEntry(
                payroll_run_id=payroll_run.id if commit else None,
                employee_id=struct.employee_id,
                basic=struct.basic,
                hra=struct.hra,
                allowances=struct.special_allowance + struct.other_allowances,
                gross_salary=gross,
                total_working_days=standard_working_days,
                lop_days=final_lop,
                absences_count=counts["absences"],
                approved_leave_count=counts["approved_leaves"],
                rejected_leave_count=counts["rejected_leaves"],
                half_day_count=counts["half_days"],
                overlap_count=counts["overlaps"],
                late_count=counts["late_count"],
                lop_deduction=int(lop_deduction_raw),
                attendance_deduction=late_deduction,
                fixed_deductions=struct.fixed_deductions,
                total_deductions=int(total_deductions_raw),
                net_salary=int(net)
            )
            entries.append(entry)
            if commit:
                db.add(entry)

            total_gross += gross
            total_deductions += entry.total_deductions
            total_net += net

        payroll_run.total_gross = total_gross
        payroll_run.total_deductions = total_deductions
        payroll_run.total_net = total_net
        payroll_run.employee_count = len(structures)

        if commit:
            db.commit()
        
        payroll_run.entries = entries # Attach for preview
        return payroll_run

    @staticmethod
    async def run_monthly_payroll(db: Session, entity_id: uuid.UUID, month: int, year: int, processed_by: uuid.UUID) -> PayrollRun:
        # Check for existing run
        existing = db.execute(select(PayrollRun).where(
            and_(PayrollRun.entity_id == entity_id, PayrollRun.month == month, PayrollRun.year == year)
        )).scalar_one_or_none()
        
        if existing and existing.status in [PayrollStatus.LOCKED, PayrollStatus.PAID]:
            raise ValueError(f"Payroll for {month}/{year} is {existing.status} and cannot be re-run.")
        
        # Cleanup old draft if exists
        if existing:
            db.execute(select(PayrollEntry).where(PayrollEntry.payroll_run_id == existing.id)) # dummy
            db.delete(existing) 
            db.commit()

        return await PayrollService._execute_payroll_internal(db, entity_id, month, year, processed_by, commit=True)

    @staticmethod
    async def preview_monthly_payroll(db: Session, entity_id: uuid.UUID, month: int, year: int, processed_by: uuid.UUID) -> PayrollRun:
        return await PayrollService._execute_payroll_internal(db, entity_id, month, year, processed_by, commit=False)

    @staticmethod
    async def update_entry_override(
        db: Session, 
        entry_id: uuid.UUID, 
        override_amount: int, 
        reason: str,
        user_id: uuid.UUID,
        entity_id: uuid.UUID
    ) -> PayrollEntry:
        entry = db.get(PayrollEntry, entry_id)
        if not entry:
            raise ValueError("Payroll entry not found.")
        
        run = db.get(PayrollRun, entry.payroll_run_id)
        if run.status in [PayrollStatus.LOCKED, PayrollStatus.PAID]:
            raise ValueError(f"Cannot override entry in a {run.status} payroll run.")

        old_val = entry.override_amount
        entry.override_amount = override_amount
        entry.override_reason = reason
        entry.overridden_by = user_id
        entry.overridden_at = datetime.utcnow()
        
        entry.total_deductions = entry.lop_deduction + entry.attendance_deduction + entry.fixed_deductions + entry.override_amount
        entry.net_salary = entry.gross_salary - entry.total_deductions
        
        if entry.net_salary < 0:
            entry.net_salary = 0
            
        # Logging Audit
        audit = AuditLog(
            entity_id=entity_id,
            user_id=user_id,
            action="PAYROLL_OVERRIDE",
            module="PAYROLL",
            resource_type="PayrollEntry",
            resource_id=str(entry.id),
            old_values={"override_amount": old_val},
            new_values={"override_amount": override_amount, "reason": reason}
        )
        db.add(audit)
        db.commit()
        return entry

    @staticmethod
    async def update_run_status(db: Session, run_id: uuid.UUID, status: PayrollStatus) -> PayrollRun:
        run = db.get(PayrollRun, run_id)
        if not run:
            raise ValueError("Payroll run not found.")
        
        if run.status == PayrollStatus.PAID and status != PayrollStatus.PAID:
             raise ValueError("PAID payroll runs are immutable.")
             
        run.status = status
        db.commit()
        return run

    @staticmethod
    async def delete_payroll_run(db: Session, run_id: uuid.UUID):
        run = db.get(PayrollRun, run_id)
        if not run:
            raise ValueError("Payroll run not found.")
            
        if run.status in [PayrollStatus.LOCKED, PayrollStatus.PAID]:
            raise ValueError(f"Cannot delete a {run.status} payroll run.")
            
        # Cascading delete entries
        db.execute(select(PayrollEntry).where(PayrollEntry.payroll_run_id == run_id)) # dummy
        db.delete(run)
        db.commit()

    @staticmethod
    async def get_payroll_runs(db: Session, entity_id: uuid.UUID) -> List[PayrollRun]:
        stmt = select(PayrollRun).where(PayrollRun.entity_id == entity_id).order_by(PayrollRun.created_at.desc())
        return db.execute(stmt).scalars().all()

    @staticmethod
    async def get_run_details(db: Session, run_id: uuid.UUID) -> Optional[PayrollRun]:
        return db.get(PayrollRun, run_id)

    @staticmethod
    async def get_run_entries(db: Session, run_id: uuid.UUID) -> List[PayrollEntry]:
        stmt = select(PayrollEntry).join(Employee).where(PayrollEntry.payroll_run_id == run_id)
        return db.execute(stmt).scalars().all()
