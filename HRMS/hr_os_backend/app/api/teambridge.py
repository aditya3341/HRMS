"""TeamBridge API — native MongoDB."""

import os
from datetime import datetime
from typing import Dict, List, Literal, Optional
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from bson.objectid import ObjectId

from app.auth.deps import get_current_user
from app.core.mongodb import get_mongo_db
from app.utils.notification_service import create_notification

router = APIRouter(prefix="/teambridge", tags=["TeamBridge"])

PALETTE = [
    ("#6C5CE7", "#f0eeff"),
    ("#00B894", "#e0faf3"),
    ("#0984E3", "#e6f4ff"),
    ("#E17055", "#fff0ec"),
    ("#A29BFE", "#f0eeff"),
    ("#D63031", "#fff0f0"),
    ("#2D3436", "#f1f3f5"),
]


class TextMessageCreate(BaseModel):
    from_user: str = Field(alias="from")
    to: str
    text: str = ""
    channel_type: Literal["dept", "dm"] = "dept"
    attachment: Optional[dict] = None


class ApprovalCreate(BaseModel):
    title: str
    description: str = ""
    attachment: Optional[dict] = None
    autoReminder: bool = False
    reminderInterval: int = 15  # in minutes
    target: str
    targetType: Literal["dept", "dm"] = "dept"
    requestedBy: str


class ApprovalAction(BaseModel):
    actorId: str
    action: Literal["approved", "rejected"]


class ReminderTrigger(BaseModel):
    approvalId: str


def _messages():
    db = get_mongo_db()
    collection = db["teambridge_messages"]
    collection.create_index([("to", 1), ("created_at", 1)])
    return collection


def _now_label() -> str:
    return datetime.now().strftime("%I:%M %p")


def _public(row: Dict) -> Dict:
    row.pop("_id", None)
    return row


def _base_message(kind: str, from_user: str, to: str, time: Optional[str] = None) -> Dict:
    return {
        "_id": uuid4().hex,
        "id": uuid4().hex[:10],
        "type": kind,
        "from": from_user,
        "to": to,
        "time": time or _now_label(),
        "created_at": datetime.utcnow().isoformat(),
    }


def _text(from_user: str, to: str, text: str, time: Optional[str] = None) -> Dict:
    row = _base_message("text", from_user, to, time)
    row["text"] = text
    return row


def _approval(
    from_user: str,
    to: str,
    title: str,
    description: str,
    attachment: Optional[dict],
    auto_reminder: bool,
    reminder_interval: int,
    time: Optional[str] = None,
) -> Dict:
    row = _base_message("approval", from_user, to, time)
    row["approval"] = {
        "id": uuid4().hex[:10],
        "title": title,
        "description": description,
        "attachment": attachment,
        "autoReminder": auto_reminder,
        "reminderInterval": reminder_interval,
        "status": "pending",
        "requestedBy": from_user,
        "approvedBy": None,
        "reminders": 0,
        "lastReminder": None,
    }
    return row


def _abbr(name: str) -> str:
    parts = [part for part in name.replace("&", " ").split() if part]
    if not parts:
        return "DEP"
    if len(parts) == 1:
        return parts[0][:3].upper()
    return "".join(part[0] for part in parts[:3]).upper()


def _initials(name: str) -> str:
    parts = [part for part in name.split() if part]
    if not parts:
        return "U"
    return "".join(part[0] for part in parts[:2]).upper()


def _dept_key(department_id) -> str:
    return f"dept_{department_id}"


def _load_departments(db, entity_id) -> List[Dict]:
    rows = list(db.departments.find({"entity_id": entity_id}).sort("name", 1))
    departments = []
    for index, dept in enumerate(rows):
        color, bg = PALETTE[index % len(PALETTE)]
        departments.append({
            "id": _dept_key(dept["_id"]),
            "name": dept.get("name"),
            "color": color,
            "bg": bg,
            "abbr": _abbr(dept.get("name")),
        })
    return departments


def _load_users(db, entity_id) -> List[Dict]:
    rows = list(db.employees.find({"entity_id": entity_id}).sort("full_name", 1))
    return [
        {
            "id": str(emp["_id"]),
            "name": emp.get("full_name"),
            "dept": _dept_key(emp["department_id"]) if emp.get("department_id") else "unassigned",
            "initials": _initials(emp.get("full_name", "")),
            "role": emp.get("designation") or "Staff",
        }
        for emp in rows
    ]


@router.get("/bootstrap")
def bootstrap(current_user: dict = Depends(get_current_user)):
    db = get_mongo_db()
    entity_id = current_user["entity_id"]
    departments = _load_departments(db, entity_id)
    users = _load_users(db, entity_id)
    if any(user["dept"] == "unassigned" for user in users):
        departments.append({
            "id": "unassigned",
            "name": "Unassigned",
            "color": "#64748B",
            "bg": "#f1f5f9",
            "abbr": "UNA",
        })

    collection = _messages()
    rows = [_public(row) for row in collection.find({})]
    by_channel: Dict[str, List[Dict]] = {}
    for row in rows:
        by_channel.setdefault(row["to"], []).append(row)
    return {
        "success": True,
        "data": {
            "departments": departments,
            "users": users,
            "current_user": current_user.get("employee_id"),
            "messages": by_channel,
        },
        "error": None,
    }


@router.post("/messages")
def create_message(payload: TextMessageCreate, current_user: dict = Depends(get_current_user)):
    target = payload.to if payload.channel_type == "dept" else f"dm_{payload.to}"
    row = _text(payload.from_user, target, payload.text.strip())
    if payload.attachment:
        row["attachment"] = payload.attachment
    if not row.get("text") and not row.get("attachment"):
        raise HTTPException(status_code=422, detail="Message text or attachment is required")
    _messages().insert_one(row)
    
    # Notify recipient(s)
    db = get_mongo_db()
    sender_emp = db.employees.find_one({"_id": payload.from_user})
    sender_name = sender_emp.get("full_name", "Someone") if sender_emp else "Someone"
    msg_body = payload.text.strip() or "[Attachment]"
    
    if payload.channel_type == "dm":
        recipient_emp = db.employees.find_one({"_id": payload.to})
        if recipient_emp and recipient_emp.get("user_id"):
            create_notification(
                user_id=recipient_emp["user_id"],
                title=f"New Message from {sender_name}",
                message=msg_body,
                notification_type="INFO",
                entity_id=current_user["entity_id"],
                link="/team",
            )
    elif payload.channel_type == "dept":
        dept_doc = db.departments.find_one({"_id": payload.to})
        dept_name = dept_doc.get("name", "Department") if dept_doc else "Department"
        for emp in db.employees.find({"department_id": payload.to}):
            if str(emp["_id"]) != payload.from_user and emp.get("user_id"):
                create_notification(
                    user_id=emp["user_id"],
                    title=f"New Message in {dept_name}",
                    message=f"{sender_name}: {msg_body}",
                    notification_type="INFO",
                    entity_id=current_user["entity_id"],
                    link="/team",
                )
                
    return {"success": True, "data": _public(row), "error": None}


@router.post("/approvals")
def create_approval(payload: ApprovalCreate, current_user: dict = Depends(get_current_user)):
    if not payload.title:
        raise HTTPException(status_code=422, detail="Approval title is required")

    target = payload.target if payload.targetType == "dept" else f"dm_{payload.target}"

    notif_text = f"New Approval Request: {payload.title}"
    if payload.description:
        notif_text += f"\nDescription: {payload.description}"

    text = _text(
        payload.requestedBy,
        target,
        notif_text,
    )
    approval = _approval(
        payload.requestedBy,
        target,
        payload.title,
        payload.description,
        payload.attachment,
        payload.autoReminder,
        payload.reminderInterval,
    )
    collection = _messages()
    collection.insert_one(text)
    collection.insert_one(approval)
    
    # Notify target recipient(s)
    db = get_mongo_db()
    sender_emp = db.employees.find_one({"_id": payload.requestedBy})
    sender_name = sender_emp.get("full_name", "Someone") if sender_emp else "Someone"
    
    if payload.targetType == "dm":
        recipient_emp = db.employees.find_one({"_id": payload.target})
        if recipient_emp and recipient_emp.get("user_id"):
            create_notification(
                user_id=recipient_emp["user_id"],
                title="New Approval Request",
                message=f"{sender_name} requested approval for: '{payload.title}'",
                notification_type="INFO",
                entity_id=current_user["entity_id"],
                link="/team",
            )
    elif payload.targetType == "dept":
        dept_doc = db.departments.find_one({"_id": payload.target})
        dept_name = dept_doc.get("name", "Department") if dept_doc else "Department"
        for emp in db.employees.find({"department_id": payload.target}):
            if str(emp["_id"]) != payload.requestedBy and emp.get("user_id"):
                create_notification(
                    user_id=emp["user_id"],
                    title=f"New Approval Request in {dept_name}",
                    message=f"{sender_name} requested approval for: '{payload.title}'",
                    notification_type="INFO",
                    entity_id=current_user["entity_id"],
                    link="/team",
                )
                
    return {"success": True, "data": {"messages": [_public(text), _public(approval)]}, "error": None}


@router.patch("/approvals/{approval_id}")
def update_approval(approval_id: str, payload: ApprovalAction, current_user: dict = Depends(get_current_user)):
    collection = _messages()
    approval_msg = None
    for row in collection.find({"type": "approval"}):
        if row.get("approval", {}).get("id") == approval_id:
            approval_msg = row
            break
    else:
        raise HTTPException(status_code=404, detail="Approval request not found")

    approval = approval_msg["approval"]
    if approval["status"] != "pending":
        raise HTTPException(status_code=409, detail="Approval request is already resolved")

    approval["status"] = payload.action
    approval["approvedBy"] = payload.actorId
    collection.update_one({"id": approval_msg["id"]}, {"$set": {"approval": approval}})

    actor_name = payload.actorId
    db = get_mongo_db()
    try:
        emp = db.employees.find_one({"_id": ObjectId(payload.actorId)})
        if not emp:
            emp = db.employees.find_one({"_id": payload.actorId})
        if emp:
            actor_name = emp.get("full_name", payload.actorId)
    except Exception:
        try:
            emp = db.employees.find_one({"_id": payload.actorId})
            if emp:
                actor_name = emp.get("full_name", payload.actorId)
        except Exception:
            pass

    status_text = f"{actor_name} {'approved' if payload.action == 'approved' else 'rejected'} request: '{approval.get('title')}'."
    system_msg = _base_message("system", payload.actorId, approval_msg["to"])
    system_msg["text"] = status_text
    collection.insert_one(system_msg)
    
    # Notify requester
    requester_emp = db.employees.find_one({"_id": approval.get("requestedBy")})
    if requester_emp and requester_emp.get("user_id"):
        action_verb = "approved" if payload.action == "approved" else "rejected"
        create_notification(
            user_id=requester_emp["user_id"],
            title=f"Approval Request {action_verb.capitalize()}",
            message=f"{actor_name} has {action_verb} your request: '{approval.get('title')}'",
            notification_type="INFO",
            entity_id=current_user["entity_id"],
            link="/team",
        )
        
    return {"success": True, "data": {"approval": approval, "message": _public(system_msg)}, "error": None}


@router.post("/upload")
def upload_file(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    db = get_mongo_db()
    os.makedirs("teambridge_uploads", exist_ok=True)
    fid = str(uuid4())
    filename = f"{fid}_{file.filename}"
    path = f"teambridge_uploads/{filename}"

    with open(path, "wb") as f:
        f.write(file.file.read())

    attachment = {
        "id": fid,
        "filename": file.filename,
        "content_type": file.content_type,
        "size": os.path.getsize(path),
        "path": path,
        "url": f"/api/teambridge/attachments/{fid}"
    }

    db.teambridge_attachments.insert_one({
        "_id": fid,
        **attachment,
        "uploaded_by": current_user.get("employee_id"),
        "uploaded_at": datetime.utcnow()
    })

    return {"success": True, "data": attachment, "error": None}


@router.get("/attachments/{file_id}")
def get_attachment(file_id: str, current_user: dict = Depends(get_current_user)):
    db = get_mongo_db()
    att = db.teambridge_attachments.find_one({"_id": file_id})
    if not att:
        raise HTTPException(status_code=404, detail="Attachment not found")
    path = att.get("path")
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(path, media_type=att.get("content_type"), filename=att.get("filename"))


@router.post("/reminders")
def trigger_reminder(payload: ReminderTrigger, current_user: dict = Depends(get_current_user)):
    collection = _messages()
    approval_msg = None
    for row in collection.find({"type": "approval"}):
        if row.get("approval", {}).get("id") == payload.approvalId:
            approval_msg = row
            break
    else:
        raise HTTPException(status_code=404, detail="Approval request not found")

    approval = approval_msg["approval"]
    if approval["status"] != "pending":
        raise HTTPException(status_code=400, detail="Approval request is not pending")

    approval["reminders"] = approval.get("reminders", 0) + 1
    approval["lastReminder"] = int(datetime.utcnow().timestamp() * 1000)
    collection.update_one({"id": approval_msg["id"]}, {"$set": {"approval": approval}})

    reminder_text = f"Reminder #{approval['reminders']} — Request '{approval['title']}' is still awaiting approval."
    reminder_msg = _base_message("reminder", approval["requestedBy"], approval_msg["to"])
    reminder_msg["approvalId"] = payload.approvalId
    reminder_msg["text"] = reminder_text
    collection.insert_one(reminder_msg)

    # Notify target recipient(s)
    db = get_mongo_db()
    sender_emp = db.employees.find_one({"_id": approval.get("requestedBy")})
    sender_name = sender_emp.get("full_name", "Someone") if sender_emp else "Someone"
    msg_to = approval_msg.get("to", "")
    
    if msg_to.startswith("dm_"):
        recipient_id = msg_to[3:]
        recipient_emp = db.employees.find_one({"_id": recipient_id})
        if recipient_emp and recipient_emp.get("user_id"):
            create_notification(
                user_id=recipient_emp["user_id"],
                title="Approval Request Reminder",
                message=f"Reminder: '{approval.get('title')}' requested by {sender_name} is awaiting approval.",
                notification_type="INFO",
                entity_id=current_user["entity_id"],
                link="/team",
            )
    elif msg_to.startswith("dept_"):
        dept_id = msg_to[5:]
        for emp in db.employees.find({"department_id": dept_id}):
            if str(emp["_id"]) != approval.get("requestedBy") and emp.get("user_id"):
                create_notification(
                    user_id=emp["user_id"],
                    title="Approval Request Reminder",
                    message=f"Reminder: '{approval.get('title')}' requested by {sender_name} is awaiting approval.",
                    notification_type="INFO",
                    entity_id=current_user["entity_id"],
                    link="/team",
                )

    return {
        "success": True,
        "data": {
            "approval": approval,
            "message": _public(reminder_msg)
        },
        "error": None
    }
