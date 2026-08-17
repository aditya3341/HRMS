"""Leave Analytics API — native MongoDB."""

from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends

from app.core.mongodb import get_mongo_db
from app.auth.deps import get_current_user
from app.auth.constants import Permissions
from app.auth.permission import require_permission

router = APIRouter(prefix="/leave-analytics", tags=["Leave Analytics"])


@router.get("/overview", dependencies=[Depends(require_permission(Permissions.LEAVE_READ))])
def get_leave_overview(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    entity_id = current_user["entity_id"]

    total_leaves = db.leave_requests.count_documents({
        "entity_id": entity_id,
        "status": "APPROVED",
    })

    pending = db.leave_requests.count_documents({
        "entity_id": entity_id,
        "status": "PENDING",
    })

    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
    on_leave_today = db.leave_requests.count_documents({
        "entity_id": entity_id,
        "status": "APPROVED",
        "start_date": {"$lte": today},
        "end_date": {"$gte": today},
    })

    employee_count = db.employees.count_documents({
        "entity_id": entity_id,
        "status": "ACTIVE",
    }) or 1

    avg_leave = round(total_leaves / employee_count, 1)

    return {
        "success": True,
        "data": {
            "total_leaves": total_leaves,
            "pending": pending,
            "on_leave_today": on_leave_today,
            "avg_leave": avg_leave,
        },
        "error": None,
    }


@router.get("/trends", dependencies=[Depends(require_permission(Permissions.LEAVE_READ))])
def get_leave_trends(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    entity_id = current_user["entity_id"]

    # Last 6 months
    months = []
    for i in range(5, -1, -1):
        dt = datetime.now(timezone.utc) - timedelta(days=i * 30)
        months.append(dt.strftime("%b"))

    start_date = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None) - timedelta(days=180)
    leaves = list(db.leave_requests.find({
        "entity_id": entity_id,
        "status": "APPROVED",
        "start_date": {"$gte": start_date},
    }))

    counts = {m: 0 for m in months}
    for l in leaves:
        sd = l.get("start_date")
        if sd:
            m = sd.strftime("%b")
            if m in counts:
                counts[m] += 1

    trends = [{"month": m, "count": counts[m]} for m in months]

    return {
        "success": True,
        "data": trends,
        "error": None,
    }


@router.get("/distribution", dependencies=[Depends(require_permission(Permissions.LEAVE_READ))])
def get_leave_distribution(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    entity_id = current_user["entity_id"]

    # Aggregate count by leave type name
    pipeline = [
        {"$match": {"entity_id": entity_id, "status": "APPROVED"}},
        {"$group": {"_id": "$leave_type_name", "count": {"$sum": 1}}},
    ]
    results = list(db.leave_requests.aggregate(pipeline))
    distribution = [{"type": r["_id"] or "Unknown", "count": r["count"]} for r in results]

    return {
        "success": True,
        "data": distribution,
        "error": None,
    }


@router.get("/department", dependencies=[Depends(require_permission(Permissions.LEAVE_READ))])
def get_leave_by_department(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    entity_id = current_user["entity_id"]

    # We need to map leave requests to department name. Let's do a join with employees and departments
    pipeline = [
        {"$match": {"entity_id": entity_id, "status": "APPROVED"}},
        {
            "$lookup": {
                "from": "employees",
                "localField": "employee_id",
                "foreignField": "_id",
                "as": "emp",
            }
        },
        {"$unwind": {"path": "$emp", "preserveNullAndEmptyArrays": True}},
        {
            "$lookup": {
                "from": "departments",
                "localField": "emp.department_id",
                "foreignField": "_id",
                "as": "dept",
            }
        },
        {"$unwind": {"path": "$dept", "preserveNullAndEmptyArrays": True}},
        {"$group": {"_id": "$dept.name", "count": {"$sum": 1}}},
    ]
    results = list(db.leave_requests.aggregate(pipeline))
    per_dept = [{"department": r["_id"] or "Unassigned", "count": r["count"]} for r in results]

    return {
        "success": True,
        "data": per_dept,
        "error": None,
    }


@router.get("/insights", dependencies=[Depends(require_permission(Permissions.LEAVE_READ))])
def get_leave_insights(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    entity_id = current_user["entity_id"]

    # Burnout risk: Employees with more than 5 days of leave in last 90 days
    cutoff = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None) - timedelta(days=90)

    pipeline = [
        {"$match": {"entity_id": entity_id, "status": "APPROVED", "start_date": {"$gte": cutoff}}},
        {"$group": {"_id": "$employee_id", "total_days": {"$sum": "$days"}}},
        {"$match": {"total_days": {"$gt": 5}}},
        {"$sort": {"total_days": -1}},
    ]
    results = list(db.leave_requests.aggregate(pipeline))

    burnout_risk = []
    for r in results:
        emp = db.employees.find_one({"_id": r["_id"]})
        burnout_risk.append({
            "name": emp.get("full_name") if emp else "Unknown",
            "leaves": float(r["total_days"]),
        })

    return {
        "success": True,
        "data": {
            "burnout_risk": burnout_risk,
        },
        "error": None,
    }
