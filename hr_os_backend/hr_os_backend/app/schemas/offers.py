"""
=============================================================
 HR OS — Pydantic Schemas: offers.py
=============================================================
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class OfferCreate(BaseModel):
    application_id: str
    offered_salary: str
    designation: str
    joining_date: str  # ISO format: YYYY-MM-DD


class OfferOut(BaseModel):
    id: str
    application_id: str
    offered_salary: str
    designation: str
    joining_date: str
    status: str
    created_by: str
    approved_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
