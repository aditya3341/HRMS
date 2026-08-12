import uuid
from datetime import datetime
from typing import Any, Optional
from sqlalchemy import String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )

    # Multi-entity isolation
    entity_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("entities.id"), nullable=False, index=True
    )

    # Who performed the action
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True
    )

    # What happened
    action: Mapped[str] = mapped_column(String, nullable=False, index=True)
    module: Mapped[str] = mapped_column(String, nullable=False, index=True)

    # Which record was affected
    resource_type: Mapped[str] = mapped_column(String, nullable=False, index=True)
    resource_id: Mapped[str] = mapped_column(String, nullable=False, index=True)

    # Detailed change state
    old_values: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)
    new_values: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)
    metadata_json: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)

    # Request context
    ip_address: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, index=True
    )
