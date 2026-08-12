import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Offer(Base):
    __tablename__ = "offers"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )

    application_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("applications.id"), nullable=False
    )

    entity_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("entities.id"), nullable=False, index=True
    )

    offered_salary: Mapped[str] = mapped_column(String, nullable=False)
    designation: Mapped[str] = mapped_column(String, nullable=False)
    joining_date: Mapped[str] = mapped_column(String, nullable=False)

    status: Mapped[str] = mapped_column(
        String, default="PENDING_APPROVAL", index=True
    )

    created_by: Mapped[str] = mapped_column(String, nullable=False)
    approved_by: Mapped[str | None] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, index=True
    )