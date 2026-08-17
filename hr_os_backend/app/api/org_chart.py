"""Org Chart API — native MongoDB."""
from fastapi import APIRouter, Depends
from app.core.mongodb import get_mongo_db
from app.auth.deps import get_current_user

router = APIRouter(prefix="/org-chart", tags=["Org Chart"])

@router.get("/")
def get_org_chart(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    employees = list(db.employees.find({"entity_id": current_user["entity_id"], "status": "ACTIVE"}))

    nodes = []
    for emp in employees:
        dept = None
        if emp.get("department_id"):
            dept_doc = db.departments.find_one({"_id": emp["department_id"]})
            dept = dept_doc["name"] if dept_doc else None
        nodes.append({
            "id": emp["_id"],
            "name": emp.get("full_name", ""),
            "designation": emp.get("designation", ""),
            "department": dept,
            "email": emp.get("email"),
            "avatar_url": emp.get("avatar_url"),
            "manager_id": emp.get("manager_id"),
        })

    return {"success": True, "data": nodes, "error": None}
