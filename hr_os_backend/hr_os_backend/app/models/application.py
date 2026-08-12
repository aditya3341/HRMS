import uuid
from datetime import datetime

from sqlalchemy import String, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )

    candidate_name: Mapped[str] = mapped_column(
        String, nullable=False
    )

    email: Mapped[str] = mapped_column(
        String, nullable=False, index=True
    )

    phone: Mapped[str] = mapped_column(
        String, nullable=False
    )

    status: Mapped[str] = mapped_column(
        String, default="APPLIED", index=True
    )

    job_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("jobs.id"), nullable=False, index=True
    )

    entity_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("entities.id"), nullable=False, index=True
    )

    resume_text: Mapped[str | None] = mapped_column(
        String, nullable=True
    )

    parsed_data: Mapped[str | None] = mapped_column(
        String, nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    employee_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("employees.id"), nullable=True
    )