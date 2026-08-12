import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from typing import List, Optional

from sqlalchemy import String, Boolean, ForeignKey, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import ENUM

from app.core.database import Base

class ApprovalModule(str, PyEnum):
    OFFER = "OFFER"
    ONBOARDING = "ONBOARDING"
    EMPLOYEE = "EMPLOYEE"

class ApproverType(str, PyEnum):
    MANAGER = "MANAGER"
    ROLE = "ROLE"
    SPECIFIC_EMPLOYEE = "SPECIFIC_EMPLOYEE"

class ApprovalStatus(str, PyEnum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    SKIPPED = "SKIPPED"
    IGNORED = "IGNORED"  # Used when ANY is satisfied, others are ignored

class ApprovalMode(str, PyEnum):
    ANY = "ANY"
    ALL = "ALL"


class ApprovalConfig(Base):
    """
    Stores workflow definitions
    """
    __tablename__ = "approval_configs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    entity_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("entities.id"), nullable=False, index=True)
    module: Mapped[str] = mapped_column(String, nullable=False, index=True)  # OFFER / ONBOARDING / EMPLOYEE
    name: Mapped[str] = mapped_column(String, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    steps: Mapped[List["ApprovalConfigStep"]] = relationship(
        "ApprovalConfigStep", 
        back_populates="config", 
        cascade="all, delete-orphan", 
        order_by="ApprovalConfigStep.step_order"
    )


class ApprovalConfigStep(Base):
    """
    Defines steps in a workflow
    """
    __tablename__ = "approval_config_steps"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    config_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("approval_configs.id", ondelete="CASCADE"), nullable=False, index=True)
    step_order: Mapped[int] = mapped_column(Integer, nullable=False)
    
    approver_type: Mapped[str] = mapped_column(String, nullable=False) # MANAGER, ROLE, SPECIFIC_EMPLOYEE
    approver_value: Mapped[str | None] = mapped_column(String, nullable=True) # Role name, employee_id, etc.
    is_mandatory: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # NEW FIX 3 - Multiple approvers mode
    approval_mode: Mapped[str] = mapped_column(String, default=ApprovalMode.ALL.value, nullable=False)

    # Optional placeholder for escalation features
    escalation_hours: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Relationships
    config: Mapped["ApprovalConfig"] = relationship("ApprovalConfig", back_populates="steps")


class ApprovalRequest(Base):
    """
    Runtime approval instance
    """
    __tablename__ = "approval_requests"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    entity_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("entities.id"), nullable=False, index=True)
    module: Mapped[str] = mapped_column(String, nullable=False)
    reference_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("applications.id"), nullable=True, index=True)  # Using generic but linking to common entities or keeping generic
    # Wait, reference_id could be offer_id, employee_id, etc. 
    # So we should just use String or UUID without a strict FK because it spans multiple tables.
    reference_id_str: Mapped[str] = mapped_column(String, nullable=False, index=True) # better to use string to hold any uuid
    
    requested_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(String, default=ApprovalStatus.PENDING.value)
    current_step: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    steps: Mapped[List["ApprovalStep"]] = relationship("ApprovalStep", back_populates="approval_request", cascade="all, delete-orphan", order_by="ApprovalStep.step_order")


class ApprovalStep(Base):
    """
    Runtime steps (can have multiple per step_order if multiple approvers)
    """
    __tablename__ = "approval_steps"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    approval_request_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("approval_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    step_order: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    approver_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("employees.id"), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String, default=ApprovalStatus.PENDING.value, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    action_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    remarks: Mapped[str | None] = mapped_column(String, nullable=True)
    
    # Feature 1: Escalation Tracking
    escalated_to: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("employees.id"), nullable=True, index=True)
    escalated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    approval_request: Mapped["ApprovalRequest"] = relationship("ApprovalRequest", back_populates="steps")


class NotificationLog(Base):
    """
    Deduplication log to ensure notification idempotency
    """
    __tablename__ = "notification_logs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    approval_request_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("approval_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    approval_step_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("approval_steps.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

