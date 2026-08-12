import uuid
import datetime
from sqlalchemy import String, ForeignKey, Integer, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class SalaryStructure(Base):
    __tablename__ = "salary_structures"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )

    employee_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("employees.id"), nullable=False, index=True
    )

    entity_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("entities.id"), nullable=False, index=True
    )

    basic: Mapped[int] = mapped_column(Integer, default=0)
    hra: Mapped[int] = mapped_column(Integer, default=0)
    special_allowance: Mapped[int] = mapped_column(Integer, default=0)
    other_allowances: Mapped[int] = mapped_column(Integer, default=0)
    fixed_deductions: Mapped[int] = mapped_column(Integer, default=0)

    ctc: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)