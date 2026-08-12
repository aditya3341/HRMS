from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import date, datetime
import uuid

class EmployeeSalaryBase(BaseModel):
    employee_id: uuid.UUID
    ctc: float
    basic: float
    hra: float
    allowances: float
    bonus: float
    pf_employee: float
    pf_employer: float
    esi: float
    professional_tax: float

class EmployeeSalaryCreate(EmployeeSalaryBase):
    pass

class EmployeeSalaryOut(EmployeeSalaryBase):
    id: uuid.UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class PayrollRunRequest(BaseModel):
    month: int
    year: int

class PayrollItemOut(BaseModel):
    id: uuid.UUID
    employee_id: uuid.UUID
    employee_name: Optional[str] = None
    basic: float
    hra: float
    allowances: float
    bonus: float
    pf: float
    esi: float
    tax: float
    leave_deduction: float
    gross_salary: float
    total_deductions: float
    net_salary: float
    working_days: float
    absent_days: float
    half_days: float
    insights: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class PayrollOut(BaseModel):
    id: uuid.UUID
    month: int
    year: int
    status: str
    total_gross: float
    total_deductions: float
    total_net: float
    created_at: datetime
    processed_at: Optional[datetime] = None
    items: List[PayrollItemOut] = []
    model_config = ConfigDict(from_attributes=True)
