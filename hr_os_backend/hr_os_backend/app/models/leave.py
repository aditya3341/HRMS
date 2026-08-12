import uuid
from datetime import datetime, date
from sqlalchemy import String, Boolean, Date, DateTime, ForeignKey, Text, Float, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.enums import DayType, AccrualType


class LeaveType(Base):
    """
    Policy Layer: Defines what types of leaves are available.
    """
    __tablename__ = "leave_types"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    entity_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("entities.id"), nullable=False, index=True)
    
    name: Mapped[str] = mapped_column(String, nullable=False)
    code: Mapped[str] = mapped_column(String, nullable=False)  # e.g., "ANNUAL", "SICK"
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    is_paid: Mapped[bool] = mapped_column(Boolean, default=True)
    max_per_year: Mapped[float | None] = mapped_column(Float, nullable=True)
    allow_negative_balance: Mapped[bool] = mapped_column(Boolean, default=False)
    requires_approval: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # NEW: Step 3 Fields
    sandwich_rule_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    accrual_type: Mapped[str] = mapped_column(String, default=AccrualType.NONE)
    accrual_rate: Mapped[float] = mapped_column(Float, default=0.0)
    accrual_day: Mapped[int] = mapped_column(nullable=False, default=1) # 1st of month
    
    carry_forward_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    carry_forward_limit: Mapped[float] = mapped_column(Float, default=0.0)
    expiry_days: Mapped[int | None] = mapped_column(nullable=True)

    color: Mapped[str | None] = mapped_column(String, nullable=True)  # HEX code for UI
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("entity_id", "code", name="uq_leave_type_entity_code"),
    )


class LeaveBalance(Base):
    """
    Tracks employee leave balances per type and year.
    """
    __tablename__ = "leave_balances"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    employee_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("employees.id"), nullable=False, index=True)
    leave_type_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("leave_types.id"), nullable=False, index=True)
    
    year: Mapped[int] = mapped_column(nullable=False)
    allocated: Mapped[float] = mapped_column(Float, default=0.0)
    used: Mapped[float] = mapped_column(Float, default=0.0)
    remaining: Mapped[float] = mapped_column(Float, default=0.0)

    # NEW: Step 3 Hardening
    last_accrual_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    leave_type: Mapped["LeaveType"] = relationship()

    __table_args__ = (
        UniqueConstraint("employee_id", "leave_type_id", "year", name="uq_leave_balance_employee_year"),
    )


class Leave(Base):
    """
    Tracks employee leave requests and approvals.
    Refactored to align with configurable leave policy engine.
    """
    __tablename__ = "leaves"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)

    # Multi-entity isolation
    entity_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("entities.id"), nullable=False, index=True)
    employee_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("employees.id"), nullable=False, index=True)

    # NEW: Link to LeaveType
    leave_type_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("leave_types.id"), nullable=True, index=True)
    
    # Backwards compatibility: keep leave_type string for now
    leave_type: Mapped[str | None] = mapped_column(String, nullable=True) 

    # Renamed from from_date/to_date (Single source of truth)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    
    # Keeping existing fields for safety (Backward Compatibility)
    from_date: Mapped[date] = mapped_column(Date, nullable=False)
    to_date: Mapped[date] = mapped_column(Date, nullable=False)
    
    # Changed from int to float for safe migration
    days: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(
        String, default="PENDING", index=True  # PENDING | APPROVED | REJECTED | CANCELLED
    )

    # NEW: Day Type for half-day support
    day_type: Mapped[str] = mapped_column(String, default=DayType.FULL_DAY)

    # NEW: audit fields
    applied_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Refactored: from approved_by (string email) to reviewed_by (UUID)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    
    # Keeping approved_by for compatibility if needed, but reviewed_by is primary now
    approved_by: Mapped[str | None] = mapped_column(String, nullable=True) 
    manager_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Indexes for performance
    __table_args__ = (
        Index("ix_leaves_date_range", "start_date", "end_date"),
        # Performance Critical Composite Index
        Index("ix_leaves_employee_start_end", "employee_id", "start_date", "end_date"),
    )


class Holiday(Base):
    """
    Calendar Layer: Defines organization-wide or entity-specific holidays.
    """
    __tablename__ = "holidays"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    entity_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("entities.id"), nullable=False, index=True)
    
    name: Mapped[str] = mapped_column(String, nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    is_optional: Mapped[bool] = mapped_column(Boolean, default=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("entity_id", "date", name="uq_holiday_entity_date"),
        Index("ix_holidays_entity_id_date", "entity_id", "date"),
    )
