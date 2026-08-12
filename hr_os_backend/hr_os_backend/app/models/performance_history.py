import uuid
from datetime import datetime
from typing import Optional, Any
from sqlalchemy import String, ForeignKey, DateTime, JSON, Float, Boolean, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.enums import (
    AppraisalStatus,
    PromotionStatus,
    SalaryChangeReason
)

class AppraisalRecord(Base):
    __tablename__ = "appraisal_records"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    entity_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("entities.id"), nullable=False, index=True)
    review_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("reviews.id"), nullable=False, index=True)
    employee_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("employees.id"), nullable=False, index=True)
    
    current_salary: Mapped[float] = mapped_column(Float, nullable=False)
    recommended_increment: Mapped[float] = mapped_column(Float, default=0.0)
    final_increment: Mapped[float] = mapped_column(Float, default=0.0)
    increment_percentage: Mapped[float] = mapped_column(Float, default=0.0)
    new_salary: Mapped[float] = mapped_column(Float, nullable=False)
    
    manager_override: Mapped[bool] = mapped_column(Boolean, default=False)
    hr_override: Mapped[bool] = mapped_column(Boolean, default=False)
    override_reason: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    status: Mapped[AppraisalStatus] = mapped_column(String, default=AppraisalStatus.DRAFT, index=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class PromotionRecord(Base):
    __tablename__ = "promotion_records"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    entity_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("entities.id"), nullable=False, index=True)
    employee_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("employees.id"), nullable=False, index=True)
    review_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("reviews.id"), nullable=True)
    
    current_designation: Mapped[str] = mapped_column(String, nullable=False)
    proposed_designation: Mapped[str] = mapped_column(String, nullable=False)
    promotion_reason: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    eligibility_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    is_fast_track: Mapped[bool] = mapped_column(Boolean, default=False)
    
    approved_by: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    status: Mapped[PromotionStatus] = mapped_column(String, default=PromotionStatus.PENDING, index=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    effective_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

class SalaryHistory(Base):
    __tablename__ = "salary_history"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    entity_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("entities.id"), nullable=False, index=True)
    employee_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("employees.id"), nullable=False, index=True)
    
    old_salary: Mapped[float] = mapped_column(Float, nullable=False)
    new_salary: Mapped[float] = mapped_column(Float, nullable=False)
    
    effective_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    change_reason: Mapped[SalaryChangeReason] = mapped_column(String, nullable=False)
    
    reference_id: Mapped[Optional[uuid.UUID]] = mapped_column(nullable=True) # appraisal_id or promotion_id
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class PerformanceSnapshot(Base):
    """Immutable record of multi-cycle performance history"""
    __tablename__ = "performance_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    entity_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("entities.id"), nullable=False, index=True)
    employee_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("employees.id"), nullable=False, index=True)
    cycle_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("performance_cycles.id"), nullable=False, index=True)
    
    rating: Mapped[float] = mapped_column(Float, nullable=False)
    band: Mapped[str] = mapped_column(String, nullable=False)
    
    increment_percentage: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    promotion_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Store full review data as JSON for deep history
    snapshot_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
