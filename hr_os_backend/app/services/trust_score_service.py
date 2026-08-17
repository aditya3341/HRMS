import uuid
from typing import Optional
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.attendance import Attendance, AttendanceRegularization
from app.models.attendance_intelligence import AttendanceBehaviorSummary, EmployeeTrustScore, AttendanceFraudFlag
from app.models.employee import Employee

class TrustScoreService:
    @staticmethod
    def calculate_trust_score(db: Session, employee_id: uuid.UUID):
        """
        Calculates the rolling trust score for an employee based on metrics.
        Formula (Config-driven):
        trust_score = (attendance_consistency * 40) + (on_time_ratio * 30) 
                     - (regularization_penalty) - (fraud_penalty)
        """
        # 1. Fetch metrics from behavior summary
        # Get latest behavioral record
        behavior = db.query(AttendanceBehaviorSummary).filter(
            AttendanceBehaviorSummary.employee_id == employee_id
        ).order_by(AttendanceBehaviorSummary.year.desc(), AttendanceBehaviorSummary.month.desc()).first()
        
        consistency = behavior.consistency_score if behavior else 1.0
        
        # 2. On-time ratio (across all history)
        attendance_stats = db.query(
            func.count(Attendance.id).label("total"),
            func.count(Attendance.id).filter(Attendance.is_late == True).label("late")
        ).filter(Attendance.employee_id == employee_id).first()
        
        total_days = attendance_stats.total if attendance_stats and attendance_stats.total > 0 else 1
        late_days = attendance_stats.late if attendance_stats else 0
        on_time_ratio = (total_days - late_days) / total_days
        
        # 3. Regularization frequency (Penalty: -20 per 10% frequency)
        reg_count = db.query(func.count(AttendanceRegularization.id)).filter(
            AttendanceRegularization.employee_id == employee_id
        ).scalar() or 0
        
        reg_freq = reg_count / total_days
        reg_penalty = reg_freq * 20.0
        
        # 4. Fraud Flags (Penalty: -10 per flag)
        fraud_count = db.query(func.count(AttendanceFraudFlag.id)).filter(
            AttendanceFraudFlag.employee_id == employee_id,
            AttendanceFraudFlag.is_resolved == False
        ).scalar() or 0
        
        fraud_penalty = fraud_count * 10.0
        
        # 5. Final Score Calculation (0-100)
        # score = (consistency * 40) + (on_time * 30) - (reg_penalty) - (fraud_penalty)
        # We start with a base score and apply modifiers
        score = (consistency * 40.0) + (on_time_ratio * 60.0) - reg_penalty - fraud_penalty
        
        # Clamp to 0-100
        score = max(0.0, min(100.0, score))
        
        # Category
        category = "HIGH"
        if score < 70:
            category = "MEDIUM"
        if score < 40:
            category = "LOW"
            
        # 6. Update table
        trust = db.query(EmployeeTrustScore).filter(
            EmployeeTrustScore.employee_id == employee_id
        ).first()
        
        if not trust:
            trust = EmployeeTrustScore(employee_id=employee_id)
            db.add(trust)
            
        trust.score = round(score, 1)
        trust.category = category
        trust.on_time_ratio = round(on_time_ratio, 2)
        trust.regularization_count = reg_count
        trust.fraud_flag_count = fraud_count
        trust.last_updated = datetime.utcnow()
        
        db.commit()
        db.refresh(trust)
        return trust

    @staticmethod
    def get_trust_score(db: Session, employee_id: uuid.UUID):
        return db.query(EmployeeTrustScore).filter(
            EmployeeTrustScore.employee_id == employee_id
        ).first()
