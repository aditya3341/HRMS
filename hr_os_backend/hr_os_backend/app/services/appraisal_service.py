import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException
from fastapi.encoders import jsonable_encoder
from app.models.performance import Review, ReviewSummary, PerformanceCycle
from app.models.performance_history import AppraisalRecord, SalaryHistory, PerformanceSnapshot
from app.models.employee import Employee
from app.models.salary_structure import SalaryStructure
from app.models.enums import AppraisalStatus, SalaryChangeReason, AuditAction
from app.services.performance_service import PerformanceService
from app.utils.audit import log_audit

class AppraisalService:
    @staticmethod
    def generate_recommendations(db: Session, cycle_id: uuid.UUID) -> List[AppraisalRecord]:
        config = PerformanceService.get_config_value(db, "APPRAISAL_CONFIG")
        rules = config.get("increment_rules", [])
        
        # Get all completed reviews for this cycle
        summaries = db.query(ReviewSummary).join(Review).filter(Review.cycle_id == cycle_id).all()
        
        records = []
        for summary in summaries:
            # Check if record already exists
            existing = db.query(AppraisalRecord).filter(AppraisalRecord.review_id == summary.review_id).first()
            if existing: continue

            employee = db.query(Employee).filter(Employee.id == summary.review.employee_id).first()
            salary_struct = db.query(SalaryStructure).filter(SalaryStructure.employee_id == employee.id, SalaryStructure.is_active == True).first()
            
            if not salary_struct: continue

            # Find matching rule for band
            increment_pct = 0.0
            for rule in rules:
                if rule["band"] == summary.performance_band:
                    # Use mid-point as recommendation
                    increment_pct = (rule["min"] + rule["max"]) / 2.0
                    break
            
            # If no specific rule, use default or 0
            
            recommendation = AppraisalRecord(
                id=uuid.uuid4(),
                entity_id=employee.entity_id,
                review_id=summary.review_id,
                employee_id=employee.id,
                current_salary=salary_struct.ctc,
                recommended_increment=round((salary_struct.ctc * increment_pct) / 100.0, 2),
                increment_percentage=increment_pct,
                final_increment=round((salary_struct.ctc * increment_pct) / 100.0, 2),
                new_salary=round(salary_struct.ctc * (1 + increment_pct / 100.0), 2),
                status=AppraisalStatus.DRAFT
            )
            db.add(recommendation)
            records.append(recommendation)
            
        db.commit()
        return records

    @staticmethod
    def update_appraisal(db: Session, appraisal_id: uuid.UUID, final_increment: float, reason: str, current_user: dict) -> AppraisalRecord:
        appraisal = db.query(AppraisalRecord).filter(AppraisalRecord.id == appraisal_id).first()
        if not appraisal:
            raise HTTPException(status_code=404, detail="Appraisal record not found")
        
        if appraisal.status == AppraisalStatus.LOCKED:
            raise HTTPException(status_code=400, detail="Cannot update a locked appraisal")

        # ─── Payroll Lock Guard ───────────────────────────────────────────────
        from app.models.payroll_lock import PayrollLock
        from app.models.performance import Review
        review = db.query(Review).filter(Review.id == appraisal.review_id).first()
        if review:
            # Determine cycle key from review cycle (format: YYYY-MM from cycle name)
            cycle = db.query(appraisal.__class__).first()  # just use review.cycle_id
            payroll_config = PerformanceService.get_config_value(db, "PAYROLL_CONFIG")
            allow_adjustment = (payroll_config or {}).get("allow_post_lock_adjustment", False)
            
            # Look up payroll lock using the review's cycle (mapped via cycle_id)
            lock = db.query(PayrollLock).filter(
                PayrollLock.cycle_id == str(review.cycle_id)
            ).first()
            
            if lock and lock.is_locked and not allow_adjustment:
                raise HTTPException(
                    status_code=400,
                    detail="Payroll is LOCKED for this cycle. Updates are blocked. Set allow_post_lock_adjustment=true in PAYROLL_CONFIG to permit adjustments."
                )
        # ─────────────────────────────────────────────────────────────────────

        old_val = appraisal.final_increment
        appraisal.final_increment = final_increment
        appraisal.new_salary = appraisal.current_salary + final_increment
        appraisal.increment_percentage = (final_increment / appraisal.current_salary * 100) if appraisal.current_salary > 0 else 0
        
        if current_user["role"] == "MANAGER":
            appraisal.manager_override = True
        elif current_user["role"] in ["HR_ADMIN", "SUPER_ADMIN"]:
            appraisal.hr_override = True
            
        appraisal.override_reason = reason
        
        log_audit(
            db=db, user=current_user,
            action=AuditAction.APPRAISAL_UPDATED,
            module="PERFORMANCE",
            resource_type="AppraisalRecord",
            resource_id=str(appraisal.id),
            old_values=jsonable_encoder({"increment": old_val}),
            new_values=jsonable_encoder({"increment": final_increment})
        )
        
        db.commit()
        db.refresh(appraisal)
        return appraisal

    @staticmethod
    def lock_appraisal(db: Session, appraisal_id: uuid.UUID, current_user: dict) -> AppraisalRecord:
        appraisal = db.query(AppraisalRecord).filter(AppraisalRecord.id == appraisal_id).first()
        if not appraisal:
            raise HTTPException(status_code=404, detail="Appraisal record not found")
        
        appraisal.status = AppraisalStatus.LOCKED
        
        # 🟢 PAYROLL INTEGRATION: Update SalaryStructure
        salary_struct = db.query(SalaryStructure).filter(
            SalaryStructure.employee_id == appraisal.employee_id, 
            SalaryStructure.is_active == True
        ).first()
        
        if salary_struct:
            # Create History
            history = SalaryHistory(
                id=uuid.uuid4(),
                entity_id=appraisal.entity_id,
                employee_id=appraisal.employee_id,
                old_salary=salary_struct.ctc,
                new_salary=appraisal.new_salary,
                change_reason=SalaryChangeReason.APPRAISAL,
                reference_id=appraisal.id
            )
            db.add(history)

            # Create Performance Snapshot
            review = db.query(Review).filter(Review.id == appraisal.review_id).first()
            summary = db.query(ReviewSummary).filter(ReviewSummary.review_id == appraisal.review_id).first()
            
            snapshot = PerformanceSnapshot(
                id=uuid.uuid4(),
                entity_id=appraisal.entity_id,
                employee_id=appraisal.employee_id,
                cycle_id=review.cycle_id,
                rating=summary.final_rating,
                band=summary.performance_band,
                increment_percentage=appraisal.increment_percentage,
                snapshot_json={
                    "appraisal_id": str(appraisal.id),
                    "review_id": str(appraisal.review_id),
                    "new_salary": appraisal.new_salary
                }
            )
            db.add(snapshot)
            
            # Update Current Structure (Assuming basic/hra ratio stays same or we just add to special_allowance)
            # For simplicity, we add the full increment to special_allowance
            diff = appraisal.new_salary - salary_struct.ctc
            salary_struct.special_allowance += int(diff)
            salary_struct.ctc = int(appraisal.new_salary)
            
        log_audit(
            db=db,
            user=current_user,
            action=AuditAction.APPRAISAL_LOCKED,
            module="PERFORMANCE",
            resource_type="AppraisalRecord",
            resource_id=str(appraisal.id)
        )
        
        db.commit()
        db.refresh(appraisal)
        return appraisal
