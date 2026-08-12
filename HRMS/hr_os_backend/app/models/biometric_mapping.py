import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class BiometricMapping(Base):
    __tablename__ = "biometric_mappings"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )

    entity_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    
    # The employee in our system
    employee_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )
    
    # The ID used on the actual biometric device (Enrollment ID / User ID)
    # This is often a number like "101", "102"
    device_enrollment_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    
    # Optional: Link to a specific device if mappings are not global across the entity
    source_device_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("biometric_devices.id", ondelete="SET NULL"),
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    
    # Relationships
    employee = relationship("Employee", backref="biometric_mappings")
    device = relationship("BiometricDevice", backref="mappings")
