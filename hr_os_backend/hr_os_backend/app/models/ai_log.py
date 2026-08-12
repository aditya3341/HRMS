import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.enums import AISource, AIUsageStatus

class AILog(Base):
    __tablename__ = "ai_logs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    employee_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("employees.id"), nullable=False, index=True)
    review_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("reviews.id"), nullable=False, index=True)
    
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    raw_response: Mapped[str] = mapped_column(Text, nullable=False)
    parsed_output: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # To store the exact extracted suggestions
    
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    source: Mapped[AISource] = mapped_column(String, nullable=False, default=AISource.AI)
    used_or_overridden: Mapped[AIUsageStatus] = mapped_column(String, nullable=False, default=AIUsageStatus.PENDING)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    employee = relationship("Employee")
    review = relationship("Review")
