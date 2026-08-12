from uuid import UUID
from datetime import datetime, date
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from app.models.enums import DayType, AccrualType


class LeaveTypeBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    is_paid: bool = True
    max_per_year: Optional[float] = None
    allow_negative_balance: bool = False
    requires_approval: bool = True
    
    # NEW: Step 3 Fields
    sandwich_rule_enabled: bool = False
    accrual_type: AccrualType = AccrualType.NONE
    accrual_rate: float = 0.0
    accrual_day: int = 1
    carry_forward_enabled: bool = False
    carry_forward_limit: float = 0.0
    expiry_days: Optional[int] = None
    
    color: Optional[str] = None
    is_active: bool = True


class LeaveTypeCreate(LeaveTypeBase):
    pass


class LeaveTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_paid: Optional[bool] = None
    max_per_year: Optional[float] = None
    allow_negative_balance: Optional[bool] = None
    requires_approval: Optional[bool] = None
    sandwich_rule_enabled: Optional[bool] = None
    accrual_type: Optional[AccrualType] = None
    accrual_rate: Optional[float] = None
    accrual_day: Optional[int] = None
    carry_forward_enabled: Optional[bool] = None
    carry_forward_limit: Optional[float] = None
    expiry_days: Optional[int] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None


class LeaveTypeRead(LeaveTypeBase):
    id: UUID
    entity_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LeaveBalanceRead(BaseModel):
    id: UUID
    employee_id: UUID
    leave_type_id: UUID
    year: int
    allocated: float
    used: float
    remaining: float
    leave_type_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LeaveRequestCreate(BaseModel):
    # New preferred field
    leave_type_id: Optional[UUID] = None
    
    # Legacy support
    leave_type: Optional[str] = None
    
    start_date: date
    end_date: date
    day_type: DayType = DayType.FULL_DAY
    days: float = Field(default=1.0, gt=0, description="Leave days value") # Frontend might not send this always
    reason: Optional[str] = None


class LeaveRequestRead(BaseModel):
    id: UUID
    entity_id: UUID
    employee_id: UUID
    leave_type_id: Optional[UUID] = None
    leave_type_name: Optional[str] = None  # Joined from LeaveType
    start_date: date
    end_date: date
    day_type: DayType
    days: float
    reason: Optional[str] = None
    status: str
    applied_at: datetime
    reviewed_by: Optional[UUID] = None
    reviewed_at: Optional[datetime] = None
    manager_note: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =============================================================
# HOLIDAYS
# =============================================================

class HolidayBase(BaseModel):
    name: str
    date: date
    is_optional: bool = False

class HolidayCreate(HolidayBase):
    pass

class HolidayRead(HolidayBase):
    id: UUID
    entity_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
    
class LeaveStats(BaseModel):
    total_available: float
    total_used: float
    total_remaining: float
    pending_requests: int

class LeaveCalendarEvent(BaseModel):
    id: UUID
    title: str
    start_date: date
    end_date: date
    event_type: str  # "LEAVE" | "HOLIDAY"
    status: Optional[str] = None
    color: Optional[str] = None
    employee_name: Optional[str] = None
