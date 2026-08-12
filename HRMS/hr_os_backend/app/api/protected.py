"""Protected routes — user profile endpoint."""

from fastapi import APIRouter, Depends

from app.auth.deps import get_current_user
from app.core.mongodb import get_mongo_db

router = APIRouter(prefix="/protected", tags=["Protected"])


@router.get("/me")
def get_me(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    user = db.users.find_one({"_id": current_user["user_id"]})
    if not user:
        return {"success": True, "data": dict(current_user), "error": None}

    employee = db.employees.find_one({"user_id": current_user["user_id"]})

    data = {
        "user_id": current_user["user_id"],
        "email": current_user.get("email"),
        "role": current_user.get("role"),
        "entity_id": current_user.get("entity_id"),
        "employee_id": current_user.get("employee_id"),
    }
    if employee:
        data["full_name"] = employee.get("full_name")
        data["employee_code"] = employee.get("employee_code")
        data["designation"] = employee.get("designation")
        data["avatar_url"] = employee.get("avatar_url")
        data["banner_url"] = employee.get("banner_url")

    # Dynamic permission resolution
    role = (current_user.get("role") or "").strip().upper().replace(" ", "_")
    role_doc = db.role_permissions.find_one({
        "role": {"$in": [current_user.get("role"), role]},
        "entity_id": current_user.get("entity_id"),
    })
    role_perms = role_doc.get("permissions", []) if role_doc else []

    user_doc = db.user_permissions.find_one({
        "user_id": current_user["user_id"],
        "entity_id": current_user["entity_id"],
    })
    user_perms = user_doc.get("permissions", []) if user_doc else []

    combined_perms = list(set(role_perms + user_perms))

    if role == "SUPER_ADMIN":
        combined_perms = [p.get("code") for p in db.permissions.find() if p.get("code")]

    data["permissions"] = combined_perms

    return {"success": True, "data": data, "error": None}
