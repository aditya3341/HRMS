import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

from app.models.enums import TicketStatus, SLAStatus

class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    entity_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("entities.id"), nullable=False, index=True)
    
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False)
    
    # IT / ADMIN / FINANCE / HR
    category: Mapped[str] = mapped_column(String, default="IT", index=True)
    # LOW / MEDIUM / HIGH
    priority: Mapped[str] = mapped_column(String, default="MEDIUM", index=True)
    # OPEN / IN_PROGRESS / RESOLVED / CLOSED
    status: Mapped[str] = mapped_column(String, default="OPEN", index=True)
    
    # SLA Fields
    sla_deadline: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, index=True)
    sla_status: Mapped[str] = mapped_column(String, default="ON_TRACK", index=True)
    
    # Assignment Fields
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("employees.id"), nullable=False, index=True)
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("employees.id"), nullable=True, index=True)
    assigned_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("employees.id"), nullable=True, index=True)
    assigned_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, index=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    comments = relationship("TicketComment", back_populates="ticket", cascade="all, delete-orphan")
    activities = relationship("TicketActivity", back_populates="ticket", cascade="all, delete-orphan")
    creator = relationship("Employee", foreign_keys=[created_by])
    assignee = relationship("Employee", foreign_keys=[assigned_to])
    assigner = relationship("Employee", foreign_keys=[assigned_by])

class TicketComment(Base):
    __tablename__ = "ticket_comments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    ticket_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tickets.id"), nullable=False, index=True)
    author_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("employees.id"), nullable=False, index=True)
    
    message: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    ticket = relationship("Ticket", back_populates="comments")
    author = relationship("Employee")

class TicketActivity(Base):
    __tablename__ = "ticket_activities"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    ticket_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tickets.id"), nullable=False, index=True)
    
    # CREATED / ASSIGNED / STATUS_CHANGED / COMMENTED / ESCALATED
    activity_type: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False)
    
    actor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("employees.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    ticket = relationship("Ticket", back_populates="activities")
    actor = relationship("Employee")
