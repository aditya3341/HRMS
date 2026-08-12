import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
from app.utils.normalization import normalize_status


class Onboarding(Base):
    __tablename__ = "onboardings"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )

    application_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("applications.id"), nullable=False, unique=True, index=True
    )

    entity_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("entities.id"), nullable=False, index=True
    )

    status: Mapped[str] = mapped_column(
        String, default="IN_PROGRESS", index=True
    )

    def __init__(self, **kwargs):
        if "status" in kwargs:
            kwargs["status"] = normalize_status(kwargs["status"])
        super().__init__(**kwargs)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, index=True
    )
