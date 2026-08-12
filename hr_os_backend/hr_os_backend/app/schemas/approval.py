from pydantic import BaseModel, Field
from uuid import UUID
from typing import List, Optional, Literal
from datetime import datetime

from app.models.approval import ApprovalModule, ApproverType, ApprovalStatus, ApprovalMode

class ApprovalConfigStepCreate(BaseModel):
    step_order: int
    approver_type: ApproverType
    approver_value: Optional[str] = None
    is_mandatory: bool = True
    approval_mode: ApprovalMode = ApprovalMode.ALL
    escalation_hours: Optional[int] = None

class ApprovalRequestCreate(BaseModel):
    module: ApprovalModule
    reference_id_str: str

class ApprovalConfigCreate(BaseModel):
    name: str
    module: ApprovalModule
    is_active: bool = True
    steps: List[ApprovalConfigStepCreate]

class ApprovalConfigStepResponse(BaseModel):
    id: UUID
    config_id: UUID
    step_order: int
    approver_type: ApproverType
    approver_value: Optional[str] = None
    is_mandatory: bool
    approval_mode: ApprovalMode
    escalation_hours: Optional[int] = None

    class Config:
        from_attributes = True

class ApprovalConfigResponse(BaseModel):
    id: UUID
    entity_id: UUID
    module: ApprovalModule
    name: str
    is_active: bool
    steps: List[ApprovalConfigStepResponse]

    class Config:
        from_attributes = True

class ApprovalStepResponse(BaseModel):
    id: UUID
    approval_request_id: UUID
    step_order: int
    approver_id: Optional[UUID] = None
    status: ApprovalStatus
    created_at: Optional[datetime] = None
    action_at: Optional[datetime] = None
    remarks: Optional[str] = None
    escalated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SlaInfo(BaseModel):
    """Server-computed SLA snapshot for an approval request."""
    status: Literal["SAFE", "DUE_SOON", "OVERDUE", "ESCALATED", "NONE"]
    hours_left: Optional[float] = None  # negative = overdue, None = no SLA configured

class ApprovalRequestResponse(BaseModel):
    id: UUID
    entity_id: UUID
    module: ApprovalModule
    reference_id_str: str
    reference: Optional[dict] = None
    requested_by: UUID
    status: ApprovalStatus
    current_step: int
    total_steps: Optional[int] = None
    requested_by_name: Optional[str] = None
    priority: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    steps: List[ApprovalStepResponse] = []
    sla: Optional[SlaInfo] = None

    class Config:
        from_attributes = True

class ApprovalActionRequest(BaseModel):
    action: ApprovalStatus  # Expected: APPROVED or REJECTED
    remarks: Optional[str] = None

class BulkApprovalActionRequest(BaseModel):
    request_ids: List[UUID]
    action: ApprovalStatus
    remarks: Optional[str] = None

class BulkApprovalError(BaseModel):
    id: UUID
    error: str

class BulkApprovalActionResponse(BaseModel):
    success: List[UUID]
    failed: List[BulkApprovalError]

class ApprovalTimelineStepResponse(BaseModel):
    step_order: int
    approver_id: Optional[UUID] = None
    approver_name: Optional[str] = None
    status: ApprovalStatus
    action_at: Optional[datetime] = None
    remarks: Optional[str] = None

    class Config:
        from_attributes = True

class ActionCenterSummary(BaseModel):
    total_pending: int
    offers: int
    onboarding: int

class ActionCenterActivity(BaseModel):
    id: UUID
    action: str
    type: str # offer | onboarding
    name: str # candidate or employee name
    timestamp: datetime

class ActionCenterResponse(BaseModel):
    pending: List[ApprovalRequestResponse]
    summary: ActionCenterSummary
    recent_activity: List[ActionCenterActivity]
