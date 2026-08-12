from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from typing import Optional

class AutomationRuleBase(BaseModel):
    trigger_type: str
    condition_value: str
    action_type: str
    action_value: str
    is_active: bool = True

class AutomationRuleCreate(AutomationRuleBase):
    pass

class AutomationRuleResponse(AutomationRuleBase):
    id: UUID
    entity_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
