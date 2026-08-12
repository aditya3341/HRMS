import uuid
import datetime
from typing import Optional
from sqlalchemy import String, ForeignKey, Integer, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
from app.models.enums import PayrollStatus


class PayrollRun(Base):
    __tablename__ = "payroll_runs"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )

    entity_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("entities.id"), nullable=False, index=True
    )

    month: Mapped[int] = mapped_column(Integer, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    
    status: Mapped[PayrollStatus] = mapped_column(
        SQLEnum(PayrollStatus), default=PayrollStatus.DRAFT, nullable=False
    )

    total_gross: Mapped[int] = mapped_column(Integer, default=0)
    total_deductions: Mapped[int] = mapped_column(Integer, default=0)
    total_net: Mapped[int] = mapped_column(Integer, default=0)
    employee_count: Mapped[int] = mapped_column(Integer, default=0)

    processed_by: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)


class PayrollEntry(Base):
    __tablename__ = "payroll_entries"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )

    payroll_run_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("payroll_runs.id"), nullable=False, index=True
    )

    employee_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("employees.id"), nullable=False, index=True
    )

    # Breakdown based on SalaryStructure at time of run
    basic: Mapped[int] = mapped_column(Integer, default=0)
    hra: Mapped[int] = mapped_column(Integer, default=0)
    allowances: Mapped[int] = mapped_column(Integer, default=0)
    
    gross_salary: Mapped[int] = mapped_column(Integer, default=0)
    
    # Intelligence Tracking (Traceability Breakdown)
    total_working_days: Mapped[int] = mapped_column(Integer, default=0)
    present_days: Mapped[float] = mapped_column(default=0.0)
    leave_days: Mapped[float] = mapped_column(default=0.0)
    lop_days: Mapped[float] = mapped_column(default=0.0)
    
    # Granular Breakdown for Audit/Hardening
    absences_count: Mapped[float] = mapped_column(default=0.0)
    approved_leave_count: Mapped[float] = mapped_column(default=0.0)
    rejected_leave_count: Mapped[float] = mapped_column(default=0.0)
    half_day_count: Mapped[float] = mapped_column(default=0.0)
    overlap_count: Mapped[float] = mapped_column(default=0.0)

    half_days: Mapped[int] = mapped_column(Integer, default=0)
    late_count: Mapped[int] = mapped_column(Integer, default=0)

    # Deductions
    lop_deduction: Mapped[int] = mapped_column(Integer, default=0)
    attendance_deduction: Mapped[int] = mapped_column(Integer, default=0)
    fixed_deductions: Mapped[int] = mapped_column(Integer, default=0)
    
    # Manual Override tracking
    override_amount: Mapped[int] = mapped_column(Integer, default=0) 
    override_reason: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    overridden_by: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    overridden_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    
    total_deductions: Mapped[int] = mapped_column(Integer, default=0)
    net_salary: Mapped[int] = mapped_column(Integer, default=0)

    # metadata
    is_paid: Mapped[bool] = mapped_column(Boolean, default=False)
    paid_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)