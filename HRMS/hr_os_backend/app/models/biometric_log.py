import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class BiometricLog(Base):
    __tablename__ = "biometric_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )

    device_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("biometric_devices.id"), nullable=True, index=True
    )

    employee_code: Mapped[str] = mapped_column(String, nullable=False, index=True)
    biometric_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    
    timestamp: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    punch_type: Mapped[str | None] = mapped_column(String, nullable=True) # IN / OUT
    
    raw_payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    face_image: Mapped[str | None] = mapped_column(String, nullable=True) 
    processed: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
