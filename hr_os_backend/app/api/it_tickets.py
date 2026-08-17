"""IT Tickets API — native MongoDB."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime
from uuid import uuid4
from app.core.mongodb import get_mongo_db
from app.auth.deps import get_current_user
from app.auth.constants import Permissions
from app.auth.permission import require_permission
from app.utils.notification_service import create_notification

router = APIRouter(prefix="/it-tickets", tags=["IT Tickets"])

class TicketCreate(BaseModel):
    title: str
    description: str = ""
    priority: str = "MEDIUM"
    category: str = "GENERAL"

@router.get("/", dependencies=[Depends(require_permission(Permissions.TICKET_READ))])
def list_tickets(current_user=Depends(get_current_user), status: str | None = None):
    db = get_mongo_db()
    filt: dict = {"entity_id": current_user["entity_id"]}
    if status:
        filt["status"] = status.upper()
    tickets = list(db.it_tickets.find(filt).sort("created_at", -1))
    for t in tickets:
        t.pop("_id", None)
        if "created_at" in t and hasattr(t["created_at"], "isoformat"):
            t["created_at"] = t["created_at"].isoformat()
    return {"success": True, "data": tickets, "error": None}

@router.post("/")
def create_ticket(payload: TicketCreate, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    tid = str(uuid4())
    doc = {
        "_id": tid, "id": tid, "entity_id": current_user["entity_id"],
        "title": payload.title, "description": payload.description,
        "priority": payload.priority.upper(), "category": payload.category,
        "status": "OPEN", "created_by": current_user["user_id"],
        "assigned_to": None, "created_at": datetime.utcnow(),
    }
    db.it_tickets.insert_one(doc)
    doc.pop("_id", None)
    doc["created_at"] = doc["created_at"].isoformat()
    return {"success": True, "data": doc, "error": None}

@router.patch("/{ticket_id}", dependencies=[Depends(require_permission(Permissions.TICKET_UPDATE))])
def update_ticket(ticket_id: str, current_user=Depends(get_current_user),
                  status: str | None = None, assigned_to: str | None = None):
    db = get_mongo_db()
    updates = {}
    if status:
        updates["status"] = status.upper()
    if assigned_to:
        updates["assigned_to"] = assigned_to
    if updates:
        db.it_tickets.update_one({"_id": ticket_id}, {"$set": updates})
        
        # Notify the ticket creator
        t = db.it_tickets.find_one({"_id": ticket_id})
        if t and t.get("created_by"):
            updates_desc = []
            if status:
                updates_desc.append(f"status changed to {status.upper()}")
            if assigned_to:
                updates_desc.append("assigned agent updated")
            
            message_body = f"Your IT Ticket '{t.get('title')}' has been updated ({', '.join(updates_desc)})."
            create_notification(
                user_id=t["created_by"],
                title="IT Ticket Updated",
                message=message_body,
                notification_type="INFO",
                entity_id=current_user["entity_id"],
                link="/it-tickets",
            )
            
    return {"success": True, "data": {"message": "Ticket updated"}, "error": None}