"""Permission guard — checks role_permissions in MongoDB."""

from fastapi import Depends, HTTPException

from app.auth.deps import get_current_user
from app.core.mongodb import get_mongo_db


def _normalized_role(value: str | None) -> str:
    return (value or "").strip().upper().replace(" ", "_")


def require_permission(permission_code: str):
    """FastAPI dependency that enforces a specific permission."""

    def checker(current_user=Depends(get_current_user)):
        role = _normalized_role(current_user.get("role"))

        # Super admins, HR Admins, and Admins bypass permission checks for core operations
        if role in ("SUPER_ADMIN", "HR_ADMIN", "ADMIN", "HR"):
            return True

        db = get_mongo_db()

        # 1. Check user-specific permissions override first (additive)
        user_doc = db.user_permissions.find_one({
            "user_id": current_user.get("user_id"),
            "entity_id": current_user.get("entity_id"),
        })
        if user_doc and permission_code in user_doc.get("permissions", []):
            return True

        # 2. Check the role_permissions collection
        doc = db.role_permissions.find_one({
            "role": {"$in": [current_user.get("role"), role]},
            "entity_id": current_user.get("entity_id"),
        })

        if doc and permission_code in doc.get("permissions", []):
            return True

        raise HTTPException(
            status_code=403,
            detail=f"Permission denied: {permission_code}",
        )

    return checker
