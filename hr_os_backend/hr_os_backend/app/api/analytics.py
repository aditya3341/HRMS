"""Performance Analytics API — native MongoDB."""

from fastapi import APIRouter, Depends, HTTPException

from app.core.mongodb import get_mongo_db
from app.auth.deps import get_current_user
from app.utils.abac import get_accessible_employee_ids

router = APIRouter(prefix="/analytics", tags=["Performance Analytics"])


@router.get("/overview/{cycle_id}")
def get_org_overview(cycle_id: str, current_user=Depends(get_current_user)):
    if current_user.get("role") not in ["HR_ADMIN", "SUPER_ADMIN", "MANAGER"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    db = get_mongo_db()
    reviews = list(db.reviews.find({"cycle_id": cycle_id}))

    total = len(reviews)
    completed = len([r for r in reviews if r.get("status") == "COMPLETED"])
    ratings = [r.get("final_rating", 0) for r in reviews if r.get("status") == "COMPLETED" and r.get("final_rating")]
    avg_rating = round(sum(ratings) / max(len(ratings), 1), 2) if ratings else 0.0

    return {
        "success": True,
        "data": {
            "total_reviews": total,
            "completed_reviews": completed,
            "average_rating": avg_rating,
        },
        "error": None,
    }


@router.get("/teams/{cycle_id}")
def get_team_analytics(cycle_id: str, current_user=Depends(get_current_user)):
    if current_user.get("role") not in ["HR_ADMIN", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="Only HR/Admins can see org-wide team breakdown")

    db = get_mongo_db()
    depts = list(db.departments.find({"entity_id": current_user["entity_id"]}))

    team_data = []
    for d in depts:
        employees = list(db.employees.find({"department_id": d["_id"]}))
        emp_ids = [e["_id"] for e in employees]

        reviews = list(db.reviews.find({"cycle_id": cycle_id, "employee_id": {"$in": emp_ids}}))
        ratings = [r.get("final_rating", 0) for r in reviews if r.get("status") == "COMPLETED" and r.get("final_rating")]
        avg = round(sum(ratings) / max(len(ratings), 1), 2) if ratings else 0.0

        team_data.append({
            "department_id": d["_id"],
            "department_name": d.get("name"),
            "review_count": len(reviews),
            "average_rating": avg,
        })

    return {"success": True, "data": team_data, "error": None}


@router.get("/trends/{employee_id}")
def get_performance_trends(employee_id: str, current_user=Depends(get_current_user)):
    # Security: Employee can see self, Manager can see team, HR can see all
    accessible_ids = get_accessible_employee_ids(get_mongo_db(), current_user)
    if employee_id not in accessible_ids:
        raise HTTPException(status_code=403, detail="Access denied")

    db = get_mongo_db()
    reviews = list(db.reviews.find({"employee_id": employee_id, "status": "COMPLETED"}).sort("created_at", 1))

    trends = []
    for r in reviews:
        cycle = db.performance_cycles.find_one({"_id": r.get("cycle_id")})
        trends.append({
            "cycle_name": cycle.get("name") if cycle else "Unknown",
            "rating": r.get("final_rating", 0),
            "self_rating": r.get("self_rating", 0),
            "manager_rating": r.get("manager_rating", 0),
        })

    return {"success": True, "data": trends, "error": None}
