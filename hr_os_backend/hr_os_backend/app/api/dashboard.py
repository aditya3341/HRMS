"""Dashboard API — native MongoDB."""

from fastapi import APIRouter, Depends
from datetime import datetime, timezone, timedelta

from app.core.mongodb import get_mongo_db
from app.auth.deps import get_current_user
from app.auth.constants import Permissions
from app.auth.permission import require_permission
from app.utils.abac import get_accessible_employee_ids

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

OVERDUE_ONBOARDING_DAYS = 7


@router.get("/stats", dependencies=[Depends(require_permission(Permissions.DASHBOARD_READ))])
def get_dashboard_stats(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    entity_id = current_user["entity_id"]
    accessible_ids = get_accessible_employee_ids(db, current_user)

    active_employees = db.employees.count_documents({
        "entity_id": entity_id, "status": "ACTIVE", "_id": {"$in": accessible_ids},
    })
    open_positions = db.jobs.count_documents({"entity_id": entity_id, "status": "OPEN"})
    new_applications = db.applications.count_documents({"entity_id": entity_id, "status": "APPLIED"})

    departed = db.employees.count_documents({
        "entity_id": entity_id,
        "status": {"$in": ["INACTIVE", "TERMINATED", "RESIGNED", "EXITED"]},
    })
    total = active_employees + departed
    retention_rate = f"{round((active_employees / total) * 100, 1)}%" if total else "100%"

    return {
        "success": True,
        "data": {
            "active_employees": active_employees,
            "open_positions": open_positions,
            "new_applications": new_applications,
            "retention_rate": retention_rate,
        },
        "error": None,
    }


@router.get("/manager", dependencies=[Depends(require_permission(Permissions.DASHBOARD_READ))])
def get_manager_dashboard(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    entity_id = current_user["entity_id"]
    accessible_ids = get_accessible_employee_ids(db, current_user)

    # KPIs
    team_size = len(accessible_ids)
    active_employees = db.employees.count_documents({
        "entity_id": entity_id, "status": "ACTIVE", "_id": {"$in": accessible_ids},
    })
    open_positions = db.jobs.count_documents({"entity_id": entity_id, "status": "OPEN"})
    offers_pending = db.offers.count_documents({"entity_id": entity_id, "status": "PENDING_APPROVAL"})

    # Hiring Funnel
    pipeline = [
        {"$match": {"entity_id": entity_id}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    status_map = {}
    for row in db.applications.aggregate(pipeline):
        status_map[row["_id"]] = row["count"]

    funnel = {
        "applied": status_map.get("APPLIED", 0),
        "interview": sum(status_map.get(s, 0) for s in ["INTERVIEW_L1", "INTERVIEW_L2", "INTERVIEW_L3"]),
        "offer_created": status_map.get("OFFER_CREATED", 0),
        "offer_sent": status_map.get("OFFER_SENT", 0),
        "accepted": status_map.get("OFFER_ACCEPTED", 0),
        "joined": status_map.get("ONBOARDING_STARTED", 0),
    }

    # Team Composition by Department
    dept_comp = []
    if accessible_ids:
        dept_pipeline = [
            {"$match": {"entity_id": entity_id, "status": "ACTIVE", "_id": {"$in": accessible_ids}}},
            {"$group": {"_id": "$department_id", "count": {"$sum": 1}}},
        ]
        dept_counts = {r["_id"]: r["count"] for r in db.employees.aggregate(dept_pipeline)}
        for dept_id, count in dept_counts.items():
            if dept_id:
                dept_doc = db.departments.find_one({"_id": dept_id})
                dept_comp.append({"name": dept_doc["name"] if dept_doc else "Unknown", "value": count})

    # Recent Activity
    events = []
    for emp in db.employees.find(
        {"entity_id": entity_id, "status": "ACTIVE", "_id": {"$in": accessible_ids}},
    ).sort("date_of_joining", -1).limit(5):
        doj = emp.get("date_of_joining")
        events.append({
            "type": "employee_joined",
            "label": f"{emp.get('full_name', '')} joined the team",
            "actor": emp.get("full_name"),
            "timestamp": doj.isoformat() if doj else None,
        })

    # Alerts — pending approvals and overdue onboarding
    cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=OVERDUE_ONBOARDING_DAYS)
    overdue = []
    for emp in db.employees.find({
        "entity_id": entity_id, "status": "ONBOARDING",
        "_id": {"$in": accessible_ids},
        "date_of_joining": {"$lt": cutoff},
    }):
        overdue.append({
            "type": "overdue_onboarding",
            "message": f"Onboarding overdue for {emp.get('full_name')}",
            "severity": "high",
            "employee_id": emp["_id"],
        })

    pending_approvals = db.approval_steps.count_documents({
        "status": "PENDING",
        "approver_id": {"$in": accessible_ids},
    }) if accessible_ids else 0

    # Manager Intelligence
    today = datetime.now(timezone.utc).date()
    today_dt = datetime.combine(today, datetime.min.time())
    late_today = db.attendance.count_documents({
        "employee_id": {"$in": accessible_ids},
        "date": today_dt,
        "is_late": True,
    }) if accessible_ids else 0

    return {
        "success": True,
        "data": {
            "kpis": {
                "team_size": team_size,
                "active_employees": active_employees,
                "open_positions": open_positions,
                "offers_pending": offers_pending,
            },
            "funnel": funnel,
            "team_composition": {"by_department": dept_comp, "by_designation": []},
            "recent_activity": events,
            "alerts": {
                "pending_approvals": pending_approvals,
                "overdue_onboarding": overdue,
                "overdue_onboarding_count": len(overdue),
            },
            "intelligence": {
                "avg_team_trust": 100.0,
                "high_performers_count": 0,
                "late_today": late_today,
            },
        },
        "error": None,
    }


@router.get("/hr-intelligence", dependencies=[Depends(require_permission(Permissions.ENTITY_MANAGE))])
def get_hr_intelligence(current_user=Depends(get_current_user)):
    """HR Intelligence dashboard — simplified for MongoDB."""
    return {
        "success": True,
        "data": {
            "avg_trust_score": 85.0,
            "risk_employee_count": 0,
            "fraud_alert_count": 0,
            "outliers": [],
        },
    }


@router.get("/me", dependencies=[Depends(get_current_user)])
def get_employee_insights(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    emp_id = current_user.get("employee_id")
    if not emp_id:
        return {"success": False, "error": "No employee record found"}

    emp = db.employees.find_one({"_id": emp_id})

    return {
        "success": True,
        "data": {
            "trust_score": 100.0,
            "trust_category": "HIGH",
            "behavior": None,
            "insights": ["Welcome to HR OS! Your attendance data will appear here."],
            "avatar_url": emp.get("avatar_url") if emp else None,
            "banner_url": emp.get("banner_url") if emp else None,
        },
    }
