import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class AutomationRule(Base):
    __tablename__ = "automation_rules"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    entity_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("entities.id"), nullable=False, index=True)
    
    # category / priority / status / SLA
    trigger_type: Mapped[str] = mapped_column(String, nullable=False, index=True)
    condition_value: Mapped[str] = mapped_column(String, nullable=False)
    
    # assign / set_priority / escalate / auto_close
    action_type: Mapped[str] = mapped_column(String, nullable=False)
    action_value: Mapped[str] = mapped_column(String, nullable=False)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
