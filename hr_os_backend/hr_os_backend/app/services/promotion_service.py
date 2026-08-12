import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.performance import Review, PerformanceCycle
from app.models.performance_history import PromotionRecord, PerformanceSnapshot
from app.models.employee import Employee
from app.models.enums import PromotionStatus, AuditAction
from app.services.performance_service import PerformanceService
from app.utils.audit import log_audit
from fastapi.encoders import jsonable_encoder

class PromotionService:
    @staticmethod
    def evaluate_eligibility(db: Session, employee_id: uuid.UUID) -> Dict[str, Any]:
        config = PerformanceService.get_config_value(db, "PROMOTION_CONFIG")
        if not config:
            return {"eligible": False, "reason": "PROMOTION_CONFIG not seeded"}
            
        min_rating = config.get("min_rating_for_promotion", "A")
        min_cycles = config.get("min_cycles_at_current_level", 2)
        
        # Get last N snapshots
        snapshots = db.query(PerformanceSnapshot).filter(
            PerformanceSnapshot.employee_id == employee_id
        ).order_by(PerformanceSnapshot.created_at.desc()).limit(min_cycles).all()
        
        if len(snapshots) < min_cycles:
            return {"eligible": False, "reason": f"Required {min_cycles} cycles, found {len(snapshots)}"}
        
        eligible = True
        for s in snapshots:
            if s.band > min_rating: # A < B in string comparison if A is better
                eligible = False
                break
                
        return {
            "eligible": eligible,
            "reason": "Meets criteria" if eligible else "Ratings below threshold",
            "recent_history": [s.band for s in snapshots]
        }

    @staticmethod
    def propose_promotion(db: Session, employee_id: uuid.UUID, proposed_designation: str, reason: str, review_id: Optional[uuid.UUID], user_ctx: dict) -> PromotionRecord:
        employee = db.query(Employee).filter(Employee.id == employee_id).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
            
        # Check if already pending
        existing = db.query(PromotionRecord).filter(
            PromotionRecord.employee_id == employee_id,
            PromotionRecord.status == PromotionStatus.PENDING
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="A promotion request is already pending")

        promotion = PromotionRecord(
            id=uuid.uuid4(),
            entity_id=employee.entity_id,
            employee_id=employee.id,
            review_id=review_id,
            current_designation=employee.designation,
            proposed_designation=proposed_designation,
            promotion_reason=reason,
            status=PromotionStatus.PENDING
        )
        db.add(promotion)
        
        log_audit(
            db=db,
            user=user_ctx,
            action=AuditAction.PROMOTION_PROPOSED,
            module="PERFORMANCE",
            resource_type="PromotionRecord",
            resource_id=str(promotion.id),
            new_values=jsonable_encoder({"designation": proposed_designation})
        )
        
        db.commit()
        db.refresh(promotion)
        return promotion

    @staticmethod
    def approve_promotion(db: Session, promotion_id: uuid.UUID, effective_date: datetime, user_ctx: dict) -> PromotionRecord:
        promotion = db.query(PromotionRecord).filter(PromotionRecord.id == promotion_id).first()
        if not promotion:
            raise HTTPException(status_code=404, detail="Promotion record not found")
            
        promotion.status = PromotionStatus.APPROVED
        promotion.approved_by = uuid.UUID(user_ctx["user_id"])
        promotion.effective_date = effective_date
        
        # 🟢 INTEGRATION: Update Employee Designation
        employee = db.query(Employee).filter(Employee.id == promotion.employee_id).first()
        if employee:
            employee.designation = promotion.proposed_designation
            
        log_audit(
            db=db,
            user=user_ctx,
            action=AuditAction.PROMOTION_APPROVED,
            module="PERFORMANCE",
            resource_type="PromotionRecord",
            resource_id=str(promotion.id)
        )
        
        db.commit()
        db.refresh(promotion)
        return promotion
