"""
=============================================================
 HR OS — Pydantic Schemas: jobs.py
 Central request/response schemas for the Jobs module.
=============================================================
"""
from pydantic import BaseModel
from typing import Optional


class JobCreate(BaseModel):
    title: str
    description: str
    location: str
    employment_type: str  # FULL_TIME | PART_TIME | CONTRACT | INTERNSHIP


class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    status: Optional[str] = None  # OPEN | CLOSED | PAUSED


class JobOut(BaseModel):
    id: str
    title: str
    description: str
    location: str
    employment_type: str
    status: str
    entity_id: str

    class Config:
        from_attributes = True
