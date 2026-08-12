import uuid
from datetime import datetime, date

from sqlalchemy import Column, String, Date, DateTime, Float, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False, index=True)
    entity_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    date = Column(Date, nullable=False, index=True)

    check_in = Column(DateTime, nullable=True)
    check_out = Column(DateTime, nullable=True)

    total_hours = Column(Float, nullable=True)

    status = Column(String, nullable=True, index=True)  # PRESENT / HALF_DAY / ABSENT
    is_late = Column(Boolean, default=False)

    ip_address = Column(String, nullable=True)
    device_info = Column(String, nullable=True)

    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    location_name = Column(String, nullable=True)
    
    selfie_url = Column(String, nullable=True)
    verification_status = Column(String, nullable=True, default="PENDING")  # VERIFIED / FAILED / MANUAL
    
    device_id = Column(String, nullable=True)
    source = Column(String, default="MANUAL")  # MANUAL / BIOMETRIC / HYBRID

    created_at = Column(DateTime, default=datetime.utcnow)
    
class AttendanceRegularization(Base):
    __tablename__ = "attendance_regularizations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    attendance_id = Column(UUID(as_uuid=True), ForeignKey("attendance.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False, index=True)
    
    reason = Column(String, nullable=False)
    comment = Column(String, nullable=True)
    status = Column(String, default="PENDING", index=True)  # PENDING / APPROVED / REJECTED
    
    approved_by = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)