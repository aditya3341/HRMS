"""
=============================================================
 HR OS — Pydantic Schemas: applications.py
=============================================================
"""
from pydantic import BaseModel, EmailStr
from typing import Optional


class OfferBrief(BaseModel):
    id: str
    status: str
    designation: str
    offered_salary: str

class ApplicationCreate(BaseModel):
    candidate_name: str
    email: str
    phone: str
    job_id: str


class ApplicationStatusUpdate(BaseModel):
    to_status: str
    notes: Optional[str] = None


class ApplicationOut(BaseModel):
    id: str
    candidate_name: str
    email: str
    phone: str
    job_id: str
    status: str
    entity_id: str
    resume_text: Optional[str] = None
    parsed_data: Optional[str] = None
    offer: Optional[OfferBrief] = None

    class Config:
        from_attributes = True
