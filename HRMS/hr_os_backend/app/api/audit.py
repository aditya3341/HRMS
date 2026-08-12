"""Audit logs API — native MongoDB."""

from datetime import datetime
from fastapi import APIRouter, Depends, Query

from app.core.mongodb import get_mongo_db
from app.auth.deps import get_current_user

router = APIRouter(prefix="/audit", tags=["Audit"])


@router.get("/logs")
def list_audit_logs(
    module: str | None = None,
    user_id: str | None = None,
    action: str | None = None,
    resource_id: str | None = None,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    db = get_mongo_db()
    entity_id = current_user["entity_id"]

    filt = {"entity_id": entity_id}
    if module:
        filt["module"] = module.upper()
    if user_id:
        filt["user_id"] = user_id
    if action:
        filt["action"] = action.upper()
    if resource_id:
        filt["resource_id"] = resource_id

    total = db.audit_logs.count_documents(filt)
    logs = list(db.audit_logs.find(filt).sort("timestamp", -1).skip(offset).limit(limit))

    items = []
    for l in logs:
        user_email = "Unknown"
        user_name = "Unknown"
        if l.get("user_id"):
            u = db.users.find_one({"_id": l["user_id"]})
            if u:
                user_email = u.get("email", "Unknown")
                emp = db.employees.find_one({"user_id": u["_id"]})
                user_name = emp.get("full_name") if emp else user_email

        items.append({
            "id": l.get("id", str(l["_id"])),
            "action": l.get("action"),
            "module": l.get("module"),
            "resource_type": l.get("resource_type"),
            "resource_id": l.get("resource_id"),
            "old_values": l.get("old_values"),
            "new_values": l.get("new_values"),
            "metadata": l.get("metadata_json"),
            "ip_address": l.get("ip_address"),
            "user_agent": l.get("user_agent"),
            "created_at": l["timestamp"].isoformat() if l.get("timestamp") and hasattr(l["timestamp"], "isoformat") else None,
            "user": {
                "email": user_email,
                "name": user_name,
            },
        })

    return {
        "success": True,
        "data": {
            "items": items,
            "total": total,
            "limit": limit,
            "offset": offset,
        },
        "error": None,
    }
