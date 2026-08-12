"""ABAC – Attribute-Based Access Control for MongoDB.

Returns employee IDs the current user is allowed to access.
"""

from app.core.mongodb import get_mongo_db


def get_accessible_employee_ids(db_ignored, current_user: dict) -> list[str]:
    """Return list of employee *string* IDs the current user may access.

    Parameters
    ----------
    db_ignored : unused – kept for call-site compatibility.
    current_user : auth context dict with user_id, role, entity_id.
    """
    db = get_mongo_db()
    role = (current_user.get("role") or "EMPLOYEE").upper()
    entity_id = current_user.get("entity_id")
    user_id = current_user.get("user_id")

    # 1. Admins see everything in the entity
    if role in ("SUPER_ADMIN", "HR_ADMIN", "HR", "ADMIN", "HR_RECRUITER"):
        docs = db.employees.find({"entity_id": entity_id}, {"_id": 1})
        return [doc["_id"] for doc in docs]

    # 2. Find current user's employee record
    me = db.employees.find_one({"user_id": user_id, "entity_id": entity_id})
    if not me:
        return []

    my_id = me["_id"]

    # 3. Employee role → self only
    if role == "EMPLOYEE":
        return [my_id]

    # 4. Manager role → self + recursive subordinates
    accessible = {my_id}
    to_process = [my_id]

    while to_process:
        subs = db.employees.find(
            {"manager_id": {"$in": to_process}, "entity_id": entity_id},
            {"_id": 1},
        )
        to_process = []
        for sub in subs:
            if sub["_id"] not in accessible:
                accessible.add(sub["_id"])
                to_process.append(sub["_id"])

    return list(accessible)
