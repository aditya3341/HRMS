"""
=============================================================
 HR OS — Pydantic Schemas: notifications.py
=============================================================
"""
from pydantic import BaseModel
from datetime import datetime


class NotificationOut(BaseModel):
    id: str
    user_id: str
    user_email: str
    title: str
    body: str
    type: str
    read: bool
    created_at: datetime

    class Config:
        from_attributes = True
