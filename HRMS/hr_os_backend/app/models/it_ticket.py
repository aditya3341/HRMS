import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class ITTicket(Base):
    __tablename__ = "it_tickets"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )

    entity_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("entities.id"), nullable=False, index=True
    )

    title: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String)

    status: Mapped[str] = mapped_column(
        String, default="OPEN", index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )