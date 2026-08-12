import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, Float, Integer, Boolean, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class AttendanceBehaviorSummary(Base):
    __tablename__ = "attendance_behavior_summaries"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    employee_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("employees.id"), nullable=False, index=True)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    
    avg_check_in_hour: Mapped[float | None] = mapped_column(Float, nullable=True) # e.g. 9.5 for 09:30
    late_count: Mapped[int] = mapped_column(Integer, default=0)
    early_exit_count: Mapped[int] = mapped_column(Integer, default=0)
    absent_count: Mapped[int] = mapped_column(Integer, default=0)
    working_hours_consistency: Mapped[float] = mapped_column(Float, default=0.0)
    consistency_score: Mapped[float] = mapped_column(Float, default=0.0) # 0 to 1
    trend: Mapped[str] = mapped_column(String, default="STABLE") # IMPROVING, STABLE, DECLINING
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class EmployeeTrustScore(Base):
    __tablename__ = "employee_trust_scores"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    employee_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("employees.id"), unique=True, nullable=False, index=True)
    
    score: Mapped[float] = mapped_column(Float, default=100.0) # 0 to 100
    category: Mapped[str] = mapped_column(String, default="HIGH") # HIGH, MEDIUM, LOW
    
    on_time_ratio: Mapped[float] = mapped_column(Float, default=1.0)
    regularization_count: Mapped[int] = mapped_column(Integer, default=0)
    fraud_flag_count: Mapped[int] = mapped_column(Integer, default=0)
    
    last_updated: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class AttendanceFraudFlag(Base):
    __tablename__ = "attendance_fraud_flags"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    employee_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("employees.id"), nullable=False, index=True)
    date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    
    fraud_type: Mapped[str] = mapped_column(String, nullable=False) # REPEATED_LOCATION, DEVICE_SWITCH, PATTERN_ANOMALY, IMPOSSIBLE_TRAVEL
    severity: Mapped[str] = mapped_column(String, default="LOW") # LOW, MEDIUM, HIGH
    details: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    resolved_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("employees.id"), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
