import uuid
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class ITAsset(Base):
    __tablename__ = "it_assets"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )

    entity_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("entities.id"), nullable=False, index=True
    )

    asset_type: Mapped[str] = mapped_column(String)
    asset_tag: Mapped[str] = mapped_column(String)

    brand: Mapped[str | None] = mapped_column(String, nullable=True)
    desktop_name: Mapped[str | None] = mapped_column(String, nullable=True)
    model: Mapped[str | None] = mapped_column(String, nullable=True)
    processor: Mapped[str | None] = mapped_column(String, nullable=True)
    ram: Mapped[str | None] = mapped_column(String, nullable=True)
    storage: Mapped[str | None] = mapped_column(String, nullable=True)
    operating_system: Mapped[str | None] = mapped_column(String, nullable=True)
    location: Mapped[str | None] = mapped_column(String, nullable=True)
    issue: Mapped[str | None] = mapped_column(String, nullable=True)
    gpu: Mapped[str | None] = mapped_column(String, nullable=True)
    assigned_to_name: Mapped[str | None] = mapped_column(String, nullable=True)

    assigned_to: Mapped[uuid.UUID | None] = mapped_column(
        String, ForeignKey("employees.id"), nullable=True
    )

    status: Mapped[str] = mapped_column(
        String, default="AVAILABLE"
    )