"""Notifications API — native MongoDB."""
from fastapi import APIRouter, Depends, HTTPException
from app.core.mongodb import get_mongo_db
from app.auth.deps import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("/")
def list_notifications(current_user=Depends(get_current_user), limit: int = 20):
    db = get_mongo_db()
    notifications = list(db.notifications.find({"user_id": current_user["user_id"]}).sort("created_at", -1).limit(limit))
    for n in notifications:
        n.pop("_id", None)
        if "created_at" in n and hasattr(n["created_at"], "isoformat"):
            n["created_at"] = n["created_at"].isoformat()
        n["body"] = n.get("message", "")
        n["read"] = n.get("is_read", False)
    return {"success": True, "data": notifications, "error": None}

@router.get("/unread-count")
def unread_count(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    count = db.notifications.count_documents({"user_id": current_user["user_id"], "is_read": False})
    return {"success": True, "data": {"count": count}, "error": None}

@router.patch("/{notification_id}/read")
def mark_read(notification_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    db.notifications.update_one({"_id": notification_id, "user_id": current_user["user_id"]}, {"$set": {"is_read": True}})
    return {"success": True, "data": {"message": "Marked as read"}, "error": None}

@router.patch("/read-all")
def mark_all_read(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    db.notifications.update_many({"user_id": current_user["user_id"], "is_read": False}, {"$set": {"is_read": True}})
    return {"success": True, "data": {"message": "All marked as read"}, "error": None}
