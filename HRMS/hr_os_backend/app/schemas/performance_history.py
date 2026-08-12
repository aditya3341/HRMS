import uuid
from datetime import datetime
from typing import Optional, Any, List, Dict
from pydantic import BaseModel
from app.models.enums import AppraisalStatus, PromotionStatus, SalaryChangeReason

class AppraisalRecordBase(BaseModel):
    review_id: uuid.UUID
    employee_id: uuid.UUID
    current_salary: float
    recommended_increment: float
    final_increment: float
    increment_percentage: float
    new_salary: float
    manager_override: bool = False
    hr_override: bool = False
    override_reason: Optional[str] = None
    status: AppraisalStatus
    employee_name: Optional[str] = None
    designation: Optional[str] = None

class AppraisalRecordCreate(BaseModel):
    review_id: uuid.UUID

class AppraisalUpdate(BaseModel):
    increment_percentage: float
    reason: str

class AppraisalRecordResponse(AppraisalRecordBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PromotionRecordBase(BaseModel):
    employee_id: uuid.UUID
    review_id: Optional[uuid.UUID] = None
    current_designation: str
    proposed_designation: str
    promotion_reason: Optional[str] = None
    eligibility_flag: bool = False
    is_fast_track: bool = False
    status: PromotionStatus
    employee_name: Optional[str] = None

class PromotionRecordCreate(BaseModel):
    employee_id: uuid.UUID
    proposed_designation: str
    promotion_reason: str
    review_id: Optional[uuid.UUID] = None

class PromotionRecordResponse(PromotionRecordBase):
    id: uuid.UUID
    created_at: datetime
    effective_date: Optional[datetime] = None

    class Config:
        from_attributes = True

class PerformanceSnapshotResponse(BaseModel):
    id: uuid.UUID
    cycle_id: uuid.UUID
    rating: float
    band: str
    increment_percentage: Optional[float] = None
    promotion_flag: bool = False
    snapshot_json: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True

class AnalyticsOverview(BaseModel):
    average_rating: float
    total_reviews: int
    band_distribution: Dict[str, int]
    average_increment_pct: float
    promotion_rate: float

class TeamAnalytics(BaseModel):
    department_id: str
    average_score: float
    participation: int
