import uuid
from typing import Optional
from datetime import datetime
from sqlalchemy import String, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.utils.normalization import normalize_status


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True, index=True
    )

    application_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("applications.id"), nullable=False, index=True
    )

    entity_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("entities.id"), nullable=False, index=True
    )

    employee_code: Mapped[str] = mapped_column(
        String, unique=True, nullable=False, index=True
    )

    full_name: Mapped[str] = mapped_column(String, nullable=False)
    designation: Mapped[str] = mapped_column(String, nullable=False, default="Staff")
    email: Mapped[str] = mapped_column(String, nullable=False, index=True)

    pan: Mapped[str | None] = mapped_column(String, nullable=True)
    aadhaar: Mapped[str | None] = mapped_column(String, nullable=True)
    uan: Mapped[str | None] = mapped_column(String, nullable=True)
    bank_account: Mapped[str | None] = mapped_column(String, nullable=True)
    
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    address: Mapped[str | None] = mapped_column(String, nullable=True)
    emergency_contact: Mapped[str | None] = mapped_column(String, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)

    manager_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("employees.id", use_alter=True, name="fk_employee_manager"), 
        nullable=True, index=True
    )

    manager_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True, index=True
    )

    department_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("departments.id"), nullable=True, index=True
    )

    status: Mapped[str] = mapped_column(
        String, default="ONBOARDING", index=True
    )

    # Relationships
    manager: Mapped[Optional["Employee"]] = relationship(
        "Employee", 
        remote_side=[id], 
        foreign_keys=[manager_id],
        back_populates="reportees"
    )
    reportees: Mapped[list["Employee"]] = relationship(
        "Employee", 
        back_populates="manager"
    )

    def __init__(self, **kwargs):
        if "status" in kwargs:
            kwargs["status"] = normalize_status(kwargs["status"])
        super().__init__(**kwargs)
    # TODO: Deprecated - use derived document status
    documents_uploaded: Mapped[bool] = mapped_column(Boolean, default=False)

    policies_accepted: Mapped[bool] = mapped_column(
        Boolean, default=False
    )
    biometric_id: Mapped[str | None] = mapped_column(
        String, nullable=True
    )

    date_of_joining: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
