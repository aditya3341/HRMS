import uuid
from datetime import datetime
from typing import Optional, Any
from sqlalchemy import String, ForeignKey, Boolean, DateTime, JSON, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.enums import (
    PerformanceCycleStatus, 
    CycleType, 
    GoalStatus, 
    ReviewStatus, 
    ReviewStepRole, 
    ReviewActionType, 
    ActionStatus
)

class PerformanceCycle(Base):
    __tablename__ = "performance_cycles"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    
    entity_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("entities.id"), nullable=False, index=True
    )
    
    name: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[CycleType] = mapped_column(String, nullable=False) # MID_YEAR / ANNUAL
    
    start_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    
    status: Mapped[PerformanceCycleStatus] = mapped_column(
        String, default=PerformanceCycleStatus.DRAFT, index=True
    )
    
    # Snapshot of SystemConfig at the time of ACTIVATION
    config_snapshot: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)
    
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class KPA(Base):
    """Key Performance Area (e.g., Technical Excellence, Leadership)"""
    __tablename__ = "kpas"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    
    entity_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("entities.id"), nullable=False, index=True
    )
    
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    kras: Mapped[list["KRA"]] = relationship("KRA", back_populates="kpa", cascade="all, delete-orphan")

class KRA(Base):
    """Key Result Area (Specific targets within a KPA)"""
    __tablename__ = "kras"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    
    kpa_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("kpas.id"), nullable=False, index=True
    )
    
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    default_weightage: Mapped[float] = mapped_column(Float, default=0.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    kpa: Mapped["KPA"] = relationship("KPA", back_populates="kras")

class EmployeeGoal(Base):
    __tablename__ = "employee_goals"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    employee_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("employees.id"), nullable=False, index=True)
    manager_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("employees.id"), nullable=False)
    cycle_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("performance_cycles.id"), nullable=False, index=True)
    
    status: Mapped[GoalStatus] = mapped_column(String, default=GoalStatus.DRAFT, index=True)
    total_weightage: Mapped[float] = mapped_column(Float, default=0.0)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    items: Mapped[list["GoalItem"]] = relationship("GoalItem", back_populates="goal", cascade="all, delete-orphan")

class GoalItem(Base):
    __tablename__ = "goal_items"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    goal_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("employee_goals.id"), nullable=False, index=True)
    
    kpa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("kpas.id"), nullable=False)
    kra_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("kras.id"), nullable=True)
    
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    weightage: Mapped[float] = mapped_column(Float, nullable=False)
    
    target_value: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    achieved_value: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    is_custom: Mapped[bool] = mapped_column(Boolean, default=False)
    
    goal: Mapped["EmployeeGoal"] = relationship("EmployeeGoal", back_populates="items")

class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    employee_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("employees.id"), nullable=False, index=True)
    manager_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("employees.id"), nullable=False)
    cycle_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("performance_cycles.id"), nullable=False, index=True)
    
    status: Mapped[ReviewStatus] = mapped_column(String, default=ReviewStatus.IN_PROGRESS, index=True)
    current_step: Mapped[ReviewStepRole] = mapped_column(String, nullable=False)
    
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    actions: Mapped[list["ReviewAction"]] = relationship("ReviewAction", back_populates="review", cascade="all, delete-orphan")
    responses: Mapped[list["ReviewResponse"]] = relationship("ReviewResponse", back_populates="review", cascade="all, delete-orphan")
    summary: Mapped[Optional["ReviewSummary"]] = relationship("ReviewSummary", back_populates="review", uselist=False)

class ReviewAction(Base):
    __tablename__ = "review_actions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    review_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("reviews.id"), nullable=False, index=True)
    
    step_role: Mapped[ReviewStepRole] = mapped_column(String, nullable=False)
    action_type: Mapped[ReviewActionType] = mapped_column(String, nullable=False)
    status: Mapped[ActionStatus] = mapped_column(String, default=ActionStatus.PENDING)
    
    acted_by: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    acted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    comments: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    review: Mapped["Review"] = relationship("Review", back_populates="actions")

class ReviewResponse(Base):
    __tablename__ = "review_responses"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    review_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("reviews.id"), nullable=False, index=True)
    goal_item_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("goal_items.id"), nullable=False)
    
    self_rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    self_comment: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    manager_rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    manager_comment: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    final_rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    review: Mapped["Review"] = relationship("Review", back_populates="responses")

class ReviewSummary(Base):
    __tablename__ = "review_summaries"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    review_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("reviews.id"), nullable=False, index=True, unique=True)
    
    calculated_score: Mapped[float] = mapped_column(Float, default=0.0)
    final_score: Mapped[float] = mapped_column(Float, default=0.0)
    performance_band: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    override_reason: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    review: Mapped["Review"] = relationship("Review", back_populates="summary")
