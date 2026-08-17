from uuid import UUID
from datetime import datetime
from typing import Any, Optional, List
from pydantic import BaseModel, Field
from app.models.enums import (
    PerformanceCycleStatus, 
    CycleType, 
    GoalStatus, 
    ReviewStatus, 
    ReviewStepRole, 
    ReviewActionType, 
    ActionStatus
)

# --- System Config Schemas ---
class SystemConfigUpdate(BaseModel):
    config_value: Any
    description: Optional[str] = None

class SystemConfigResponse(BaseModel):
    id: UUID
    config_key: str
    config_value: Any
    description: Optional[str] = None
    is_active: bool
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Performance Cycle Schemas ---
class PerformanceCycleCreate(BaseModel):
    name: str
    type: CycleType
    start_date: datetime
    end_date: datetime

class PerformanceCycleResponse(BaseModel):
    id: UUID
    name: str
    type: CycleType
    start_date: datetime
    end_date: datetime
    status: PerformanceCycleStatus
    config_snapshot: Optional[dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- KPA / KRA Schemas ---
class KRACreate(BaseModel):
    name: str
    description: Optional[str] = None
    default_weightage: float = 0.0

class KRAResponse(BaseModel):
    id: UUID
    kpa_id: UUID
    name: str
    description: Optional[str] = None
    default_weightage: float
    is_active: bool

    class Config:
        from_attributes = True

class KPACreate(BaseModel):
    name: str
    description: Optional[str] = None

class KPAResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    is_active: bool
    kras: List[KRAResponse] = []

    class Config:
        from_attributes = True

# --- Goal Schemas ---
class GoalItemBase(BaseModel):
    kpa_id: UUID
    kra_id: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    weightage: float
    target_value: Optional[str] = None
    is_custom: bool = False

class GoalItemCreate(GoalItemBase):
    pass

class GoalItemResponse(GoalItemBase):
    id: UUID
    goal_id: UUID
    achieved_value: Optional[str] = None

    class Config:
        from_attributes = True

class EmployeeGoalCreate(BaseModel):
    cycle_id: UUID
    items: List[GoalItemCreate]

class EmployeeGoalResponse(BaseModel):
    id: UUID
    employee_id: UUID
    manager_id: UUID
    cycle_id: UUID
    status: GoalStatus
    total_weightage: float
    created_at: datetime
    updated_at: datetime
    items: List[GoalItemResponse]

    class Config:
        from_attributes = True

# --- Review Schemas ---
class ReviewActionResponse(BaseModel):
    id: UUID
    step_role: ReviewStepRole
    action_type: ReviewActionType
    status: ActionStatus
    acted_by: Optional[UUID] = None
    acted_at: Optional[datetime] = None
    comments: Optional[str] = None

    class Config:
        from_attributes = True

class ReviewResponseItem(BaseModel):
    id: UUID
    goal_item_id: UUID
    self_rating: Optional[float] = None
    self_comment: Optional[str] = None
    manager_rating: Optional[float] = None
    manager_comment: Optional[str] = None
    final_rating: Optional[float] = None

    class Config:
        from_attributes = True

class ReviewSummaryResponse(BaseModel):
    calculated_score: float
    final_score: float
    performance_band: Optional[str] = None
    override_reason: Optional[str] = None

    class Config:
        from_attributes = True

class ReviewResponseFull(BaseModel):
    id: UUID
    employee_id: UUID
    manager_id: UUID
    cycle_id: UUID
    status: ReviewStatus
    current_step: ReviewStepRole
    started_at: datetime
    completed_at: Optional[datetime] = None
    actions: List[ReviewActionResponse]
    responses: List[ReviewResponseItem]
    summary: Optional[ReviewSummaryResponse] = None

    class Config:
        from_attributes = True

# --- Review Submission Handlers ---
class SelfReviewSubmit(BaseModel):
    responses: List[dict] # {goal_item_id: UUID, self_rating: float, self_comment: str}

class ManagerReviewSubmit(BaseModel):
    responses: List[dict] # {goal_item_id: UUID, manager_rating: float, manager_comment: str}
    final_comment: Optional[str] = None
