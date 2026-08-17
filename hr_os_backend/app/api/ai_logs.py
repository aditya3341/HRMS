"""AI Interaction Logs API — native MongoDB."""

from fastapi import APIRouter, Depends, HTTPException

from app.core.mongodb import get_mongo_db
from app.auth.deps import get_current_user

router = APIRouter(prefix="/ai/logs", tags=["AI Observability"])


def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ["SUPER_ADMIN", "HR_ADMIN", "HR"]:
        raise HTTPException(status_code=403, detail="Not authorized. Only HR and Super Admins can view AI logs.")
    return current_user


@router.get("")
def get_all_ai_logs(
    current_user: dict = Depends(require_admin),
):
    db = get_mongo_db()
    logs = list(db.ai_logs.find({"entity_id": current_user["entity_id"]}).sort("created_at", -1))
    for l in logs:
        l.pop("_id", None)
        if "created_at" in l and hasattr(l["created_at"], "isoformat"):
            l["created_at"] = l["created_at"].isoformat()
    return {"success": True, "data": logs, "error": None}


@router.get("/{employee_id}")
def get_ai_logs_by_employee(
    employee_id: str,
    current_user: dict = Depends(require_admin),
):
    db = get_mongo_db()
    logs = list(db.ai_logs.find({
        "employee_id": employee_id,
        "entity_id": current_user["entity_id"],
    }).sort("created_at", -1))

    for l in logs:
        l.pop("_id", None)
        if "created_at" in l and hasattr(l["created_at"], "isoformat"):
            l["created_at"] = l["created_at"].isoformat()
    return {"success": True, "data": logs, "error": None}
