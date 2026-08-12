from uuid import UUID
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

class TicketCommentBase(BaseModel):
    message: str

class TicketCommentCreate(TicketCommentBase):
    pass

class TicketCommentResponse(TicketCommentBase):
    id: UUID
    ticket_id: UUID
    author_id: UUID
    author_name: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class TicketActivityResponse(BaseModel):
    id: UUID
    activity_type: str
    description: str
    actor_id: UUID
    actor_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TicketBase(BaseModel):
    title: str
    description: str
    category: str = "IT"

class TicketCreate(TicketBase):
    pass

class TicketUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None

class TicketAssign(BaseModel):
    assigned_to: UUID

class TicketResponse(TicketBase):
    id: UUID
    entity_id: UUID
    status: str
    priority: str
    created_by: UUID
    created_by_name: Optional[str] = None
    assigned_to: Optional[UUID] = None
    assigned_to_name: Optional[str] = None
    assigned_by: Optional[UUID] = None
    assigned_by_name: Optional[str] = None
    assigned_at: Optional[datetime] = None
    sla_deadline: Optional[datetime] = None
    sla_status: str
    created_at: datetime
    updated_at: datetime
    comments: List[TicketCommentResponse] = []
    activities: List[TicketActivityResponse] = []
    
    model_config = ConfigDict(from_attributes=True)

class TicketListResponse(BaseModel):
    items: List[TicketResponse]
    total: int
