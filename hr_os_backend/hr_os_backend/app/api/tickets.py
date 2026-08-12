"""Tickets (ZipaDesk) API — native MongoDB."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime
from uuid import uuid4
from app.core.mongodb import get_mongo_db
from app.auth.deps import get_current_user

router = APIRouter(prefix="/tickets", tags=["Tickets"])

class TicketCreate(BaseModel):
    title: str
    description: str = ""
    priority: str = "MEDIUM"
    category: str = "GENERAL"
    department: str = ""

class CommentCreate(BaseModel):
    content: str | None = None
    message: str | None = None

class TicketUpdate(BaseModel):
    status: str | None = None
    assigned_to: str | None = None
    priority: str | None = None

class TicketAssign(BaseModel):
    assigned_to: str

@router.get("")
@router.get("/")
def list_tickets(
    current_user=Depends(get_current_user),
    status: str | None = None,
    category: str | None = None,
    priority: str | None = None,
    sla_status: str | None = None,
    assigned_to_me: bool | None = None,
):
    db = get_mongo_db()
    filt: dict = {"entity_id": current_user["entity_id"]}
    if status:
        filt["status"] = status.upper()
    if category:
        filt["category"] = category.upper()
    if priority:
        filt["priority"] = priority.upper()
    if sla_status:
        filt["sla_status"] = sla_status.upper()
        
    role = current_user.get("role", "").upper()
    is_privileged = role in ("SUPER_ADMIN", "HR_ADMIN", "HR", "ADMIN", "MANAGER")
    
    if assigned_to_me:
        filt["assigned_to"] = current_user["user_id"]
    elif not is_privileged:
        filt["$or"] = [
            {"created_by": current_user["user_id"]},
            {"assigned_to": current_user["user_id"]}
        ]

    tickets = list(db.tickets.find(filt).sort("created_at", -1))
    for t in tickets:
        t.pop("_id", None)
        for key in ["created_at", "updated_at"]:
            if key in t and hasattr(t[key], "isoformat"):
                t[key] = t[key].isoformat()
        # Count comments
        t["comment_count"] = db.ticket_comments.count_documents({"ticket_id": t.get("id")})
    return {"success": True, "data": {"items": tickets, "total": len(tickets)}, "error": None}

@router.get("/my")
def my_tickets(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    tickets = list(db.tickets.find({"created_by": current_user["user_id"]}).sort("created_at", -1))
    for t in tickets:
        t.pop("_id", None)
        for key in ["created_at", "updated_at"]:
            if key in t and hasattr(t[key], "isoformat"):
                t[key] = t[key].isoformat()
    return {"success": True, "data": tickets, "error": None}

@router.get("/{ticket_id}")
def get_ticket(ticket_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    ticket = db.tickets.find_one({"_id": ticket_id})
    if not ticket:
        raise HTTPException(404, "Ticket not found")
    ticket.pop("_id", None)
    for key in ["created_at", "updated_at"]:
        if key in ticket and hasattr(ticket[key], "isoformat"):
            ticket[key] = ticket[key].isoformat()
    comments = list(db.ticket_comments.find({"ticket_id": ticket_id}).sort("created_at", 1))
    for c in comments:
        c.pop("_id", None)
        if "created_at" in c and hasattr(c["created_at"], "isoformat"):
            c["created_at"] = c["created_at"].isoformat()
    ticket["comments"] = comments
    return {"success": True, "data": ticket, "error": None}

@router.post("")
@router.post("/")
def create_ticket(payload: TicketCreate, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    tid = str(uuid4())
    emp = db.employees.find_one({"user_id": current_user["user_id"]})
    doc = {
        "_id": tid, "id": tid, "entity_id": current_user["entity_id"],
        "title": payload.title, "description": payload.description,
        "priority": payload.priority.upper(), "category": payload.category,
        "department": payload.department, "status": "OPEN",
        "created_by": current_user["user_id"],
        "created_by_name": emp.get("full_name") if emp else current_user.get("email"),
        "assigned_to": None, "sla_status": "ON_TRACK",
        "created_at": datetime.utcnow(), "updated_at": datetime.utcnow(),
    }
    
    # Run automation rules
    rules = list(db.automation_rules.find({"trigger": "TICKET_CREATED"}))
    for rule in rules:
        cond = rule.get("condition", "")
        # simple case-insensitive and lowercased matching context
        context = {
            "priority": payload.priority.lower(),
            "category": payload.category.lower(),
            "title": payload.title.lower(),
        }
        # Safely evaluate condition
        matched = False
        try:
            matched = eval(cond, {"__builtins__": None}, context)
        except Exception:
            # Fallback simple string matching if eval fails
            if "priority == 'critical'" in cond and payload.priority.lower() == "critical":
                matched = True
        
        if matched:
            if rule.get("action") == "ASSIGN_TO":
                doc["assigned_to"] = rule.get("action_value")
                
    db.tickets.insert_one(doc)
    doc.pop("_id", None)
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    return {"success": True, "data": doc, "error": None}

@router.patch("/{ticket_id}")
def update_ticket(
    ticket_id: str,
    payload: TicketUpdate = None,
    status: str | None = None,
    assigned_to: str | None = None,
    priority: str | None = None,
    current_user=Depends(get_current_user)
):
    db = get_mongo_db()
    updates: dict = {"updated_at": datetime.utcnow()}
    
    st = (payload.status if payload else None) or status
    ast = (payload.assigned_to if payload else None) or assigned_to
    pr = (payload.priority if payload else None) or priority
    
    if st:
        updates["status"] = st.upper()
    if ast:
        updates["assigned_to"] = ast
    if pr:
        updates["priority"] = pr.upper()
        
    db.tickets.update_one({"_id": ticket_id}, {"$set": updates})
    return {"success": True, "data": {"message": "Ticket updated"}, "error": None}

@router.post("/{ticket_id}/comments")
@router.post("/{ticket_id}/comment")
def add_comment(ticket_id: str, payload: CommentCreate, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    cid = str(uuid4())
    emp = db.employees.find_one({"user_id": current_user["user_id"]})
    msg = payload.message or payload.content or ""
    doc = {
        "_id": cid, "id": cid, "ticket_id": ticket_id,
        "content": msg, "author_id": current_user["user_id"],
        "author_name": emp.get("full_name") if emp else current_user.get("email"),
        "created_at": datetime.utcnow(),
    }
    db.ticket_comments.insert_one(doc)
    doc.pop("_id", None)
    doc["created_at"] = doc["created_at"].isoformat()
    return {"success": True, "data": doc, "error": None}

@router.patch("/{ticket_id}/assign")
def assign_ticket(
    ticket_id: str,
    payload: TicketAssign,
    current_user=Depends(get_current_user)
):
    db = get_mongo_db()
    updates = {
        "assigned_to": payload.assigned_to,
        "updated_at": datetime.utcnow()
    }
    db.tickets.update_one({"_id": ticket_id}, {"$set": updates})
    return {"success": True, "data": {"message": "Ticket assigned"}, "error": None}
