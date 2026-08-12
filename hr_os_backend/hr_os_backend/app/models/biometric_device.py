import uuid
from datetime import datetime
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class BiometricDevice(Base):
    __tablename__ = "biometric_devices"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )

    entity_id: Mapped[uuid.UUID] = mapped_column(String, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    device_type: Mapped[str] = mapped_column(String, nullable=False)  # FACE / FINGER
    connection_type: Mapped[str] = mapped_column(String, nullable=False) # PUSH / PULL / FILE
    
    ip_address: Mapped[str | None] = mapped_column(String, nullable=True)
    port: Mapped[int | None] = mapped_column(nullable=True)
    api_url: Mapped[str | None] = mapped_column(String, nullable=True)
    device_code: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    
    status: Mapped[str] = mapped_column(String, default="ACTIVE", index=True)
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    
    latitude: Mapped[float | None] = mapped_column(nullable=True)
    longitude: Mapped[float | None] = mapped_column(nullable=True)

    registered_by: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )