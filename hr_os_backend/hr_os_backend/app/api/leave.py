"""Leave API — full CRUD with native MongoDB."""

import logging
from datetime import date, datetime, timedelta
from uuid import uuid4
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.core.mongodb import get_mongo_db
from app.auth.deps import get_current_user
from app.auth.permission import require_permission
from app.auth.constants import Permissions
from app.utils.audit import log_audit
from app.utils.abac import get_accessible_employee_ids
from app.utils.notification_service import create_notification

router = APIRouter(prefix="/leave", tags=["Leave"])
alias_router = APIRouter(prefix="/leaves", tags=["Leave (Alias)"])
logger = logging.getLogger(__name__)


# ── Pydantic schemas ──────────────────────────────────────────
class LeaveTypeCreate(BaseModel):
    name: str
    code: str
    description: str = ""
    is_paid: bool = True
    max_per_year: int = 12
    allow_negative_balance: bool = False
    requires_approval: bool = True
    color: str = "#3B82F6"

class LeaveTypeUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_paid: bool | None = None
    max_per_year: int | None = None
    allow_negative_balance: bool | None = None
    requires_approval: bool | None = None
    color: str | None = None
    is_active: bool | None = None

class LeaveRequestCreate(BaseModel):
    leave_type_id: str
    start_date: str
    end_date: str
    reason: str = ""
    day_type: str = "FULL_DAY"

class HolidayCreate(BaseModel):
    name: str
    date: str
    is_optional: bool = False


def _str_to_date(s: str) -> datetime:
    return datetime.strptime(s, "%Y-%m-%d")


# ═══════════════ LEAVE TYPES ═══════════════

@router.post("/types")
def create_leave_type(payload: LeaveTypeCreate, current_user=Depends(get_current_user),
                      _=Depends(require_permission(Permissions.ENTITY_MANAGE))):
    db = get_mongo_db()
    entity_id = current_user["entity_id"]

    if db.leave_types.find_one({"entity_id": entity_id, "code": payload.code.upper()}):
        raise HTTPException(400, f"Leave type code '{payload.code}' already exists.")

    lid = str(uuid4())
    doc = {
        "_id": lid, "id": lid, "entity_id": entity_id,
        "name": payload.name, "code": payload.code.upper(),
        "description": payload.description, "is_paid": payload.is_paid,
        "max_per_year": payload.max_per_year,
        "allow_negative_balance": payload.allow_negative_balance,
        "requires_approval": payload.requires_approval,
        "color": payload.color, "is_active": True,
    }
    db.leave_types.insert_one(doc)
    return {"success": True, "data": doc, "error": None}


@router.get("/types")
def list_leave_types(current_user=Depends(get_current_user), include_inactive: bool = False):
    db = get_mongo_db()
    filt = {"entity_id": current_user["entity_id"]}
    if not include_inactive:
        filt["is_active"] = True
    types = list(db.leave_types.find(filt))
    for t in types:
        t.pop("_id", None)
    return {"success": True, "data": types, "error": None}


@router.patch("/types/{type_id}")
def update_leave_type(type_id: str, payload: LeaveTypeUpdate, current_user=Depends(get_current_user),
                      _=Depends(require_permission(Permissions.ENTITY_MANAGE))):
    db = get_mongo_db()
    lt = db.leave_types.find_one({"_id": type_id})
    if not lt:
        raise HTTPException(404, "Leave type not found")

    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if updates:
        db.leave_types.update_one({"_id": type_id}, {"$set": updates})
    updated = db.leave_types.find_one({"_id": type_id})
    updated.pop("_id", None)
    return {"success": True, "data": updated, "error": None}


# ═══════════════ LEAVE BALANCES ═══════════════

@router.get("/balances")
def get_my_balances(current_user=Depends(get_current_user), year: int | None = None):
    db = get_mongo_db()
    emp = db.employees.find_one({"user_id": current_user["user_id"], "entity_id": current_user["entity_id"]})
    if not emp:
        return {"success": True, "data": [], "error": None}

    yr = year or datetime.utcnow().year
    balances = list(db.leave_balances.find({"employee_id": emp["_id"], "year": yr}))

    result = []
    for b in balances:
        lt = db.leave_types.find_one({"_id": b.get("leave_type_id")})
        result.append({
            "id": b.get("id", b["_id"]),
            "leave_type_id": b.get("leave_type_id"),
            "leave_type_name": lt["name"] if lt else "Unknown",
            "leave_type_code": lt["code"] if lt else "??",
            "color": lt.get("color", "#888") if lt else "#888",
            "year": b.get("year"),
            "entitled": b.get("entitled", 0),
            "used": b.get("used", 0),
            "balance": b.get("balance", 0),
            "carry_forward": b.get("carry_forward", 0),
        })

    return {"success": True, "data": result, "error": None}


@router.get("/balance/me")
def get_my_balances_me(current_user=Depends(get_current_user), year: int | None = None):
    db = get_mongo_db()
    emp = db.employees.find_one({"user_id": current_user["user_id"], "entity_id": current_user["entity_id"]})
    if not emp:
        return {"success": True, "data": [], "error": None}

    yr = year or datetime.utcnow().year
    balances = list(db.leave_balances.find({"employee_id": emp["_id"], "year": yr}))

    result = []
    for b in balances:
        lt = db.leave_types.find_one({"_id": b.get("leave_type_id")})
        result.append({
            "id": b["_id"],
            "employee_id": str(emp["_id"]),
            "leave_type_id": b.get("leave_type_id"),
            "leave_type_name": lt["name"] if lt else "Unknown",
            "leave_type_code": lt["code"] if lt else "??",
            "color": lt.get("color", "#888") if lt else "#888",
            "year": b.get("year"),
            "allocated": b.get("entitled", 0.0),
            "entitled": b.get("entitled", 0.0),
            "used": b.get("used", 0.0),
            "remaining": b.get("balance", 0.0),
            "balance": b.get("balance", 0.0),
            "carry_forward": b.get("carry_forward", 0.0),
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        })

    return {"success": True, "data": result, "error": None}


@router.get("/balances/{employee_id}")

def get_employee_balances(employee_id: str, current_user=Depends(get_current_user),
                          year: int | None = None):
    db = get_mongo_db()
    yr = year or datetime.utcnow().year
    balances = list(db.leave_balances.find({"employee_id": employee_id, "year": yr}))

    result = []
    for b in balances:
        lt = db.leave_types.find_one({"_id": b.get("leave_type_id")})
        result.append({
            "id": b.get("id", b["_id"]),
            "leave_type_id": b.get("leave_type_id"),
            "leave_type_name": lt["name"] if lt else "Unknown",
            "leave_type_code": lt["code"] if lt else "??",
            "color": lt.get("color", "#888") if lt else "#888",
            "year": b.get("year"),
            "entitled": b.get("entitled", 0),
            "used": b.get("used", 0),
            "balance": b.get("balance", 0),
        })

    return {"success": True, "data": result, "error": None}


# ═══════════════ LEAVE REQUESTS ═══════════════

@router.post("/requests")
def apply_leave(payload: LeaveRequestCreate, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    entity_id = current_user["entity_id"]
    emp = db.employees.find_one({"user_id": current_user["user_id"], "entity_id": entity_id})
    if not emp:
        raise HTTPException(404, "No employee record found")

    start = _str_to_date(payload.start_date)
    end = _str_to_date(payload.end_date)
    if end < start:
        raise HTTPException(400, "End date cannot be before start date")

    # Calculate working days (simple: exclude weekends)
    days = 0
    cur = start
    while cur <= end:
        if cur.weekday() < 5:
            days += 0.5 if payload.day_type in ("FIRST_HALF", "SECOND_HALF") else 1
        cur += timedelta(days=1)

    if days <= 0:
        raise HTTPException(400, "No working days in the selected range")

    # Check balance
    yr = start.year
    balance = db.leave_balances.find_one({
        "employee_id": emp["_id"], "leave_type_id": payload.leave_type_id, "year": yr,
    })
    if balance and balance.get("balance", 0) < days:
        lt = db.leave_types.find_one({"_id": payload.leave_type_id})
        if not (lt and lt.get("allow_negative_balance")):
            raise HTTPException(400, f"Insufficient leave balance. Available: {balance.get('balance', 0)}, Requested: {days}")

    # Check overlap
    overlap = db.leave_requests.find_one({
        "employee_id": emp["_id"],
        "status": {"$in": ["PENDING", "APPROVED"]},
        "start_date": {"$lte": end},
        "end_date": {"$gte": start},
    })
    if overlap:
        raise HTTPException(400, "Leave request overlaps with an existing request")

    rid = str(uuid4())
    lt = db.leave_types.find_one({"_id": payload.leave_type_id})

    role = (current_user.get("role") or "").upper()
    is_hr = role in ("SUPER_ADMIN", "HR_ADMIN", "HR")

    status = "APPROVED" if is_hr else "PENDING"
    manager_approved = True if is_hr else False
    hr_approved = True if is_hr else False

    doc = {
        "_id": rid, "id": rid,
        "entity_id": entity_id,
        "employee_id": emp["_id"],
        "employee_name": emp.get("full_name"),
        "leave_type_id": payload.leave_type_id,
        "leave_type_name": lt["name"] if lt else "Unknown",
        "start_date": start,
        "end_date": end,
        "days": days,
        "day_type": payload.day_type,
        "reason": payload.reason,
        "status": status,
        "manager_approved": manager_approved,
        "hr_approved": hr_approved,
        "applied_at": datetime.utcnow(),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    db.leave_requests.insert_one(doc)

    # Deduct balance immediately if self-approved
    if is_hr:
        yr = start.year if hasattr(start, "year") else datetime.utcnow().year
        db.leave_balances.update_one(
            {"employee_id": emp["_id"], "leave_type_id": payload.leave_type_id, "year": yr},
            {"$inc": {"used": days, "balance": -days}},
        )

    # Notify manager if not self-approved
    if not is_hr and emp.get("manager_user_id"):
        create_notification(
            user_id=emp["manager_user_id"],
            title="Leave Request",
            message=f"{emp.get('full_name')} applied for {days} day(s) of {lt['name'] if lt else 'leave'}",
            notification_type="LEAVE",
            entity_id=entity_id,
            link="/leaves/manage",
        )

    log_audit(user=current_user, action="LEAVE_APPLIED", module="Leave",
              resource_type="LeaveRequest", resource_id=rid)

    doc.pop("_id", None)
    for key in ["start_date", "end_date", "created_at", "updated_at", "applied_at"]:
        if key in doc and hasattr(doc[key], "isoformat"):
            doc[key] = doc[key].isoformat()

    return {"success": True, "data": doc, "error": None}


def _enrich_leave_requests(db, requests: list) -> list:
    for r in requests:
        r.pop("_id", None)
        
        # Populate employee
        emp_id = r.get("employee_id")
        emp = db.employees.find_one({"_id": emp_id})
        if emp:
            r["employee"] = {
                "id": emp["_id"],
                "full_name": emp.get("full_name", "Unknown"),
                "email": emp.get("email", "")
            }
            r["employee_name"] = emp.get("full_name", "Unknown")
        else:
            r["employee"] = {
                "id": emp_id,
                "full_name": r.get("employee_name", "Unknown"),
                "email": ""
            }
            r["employee_name"] = r.get("employee_name", "Unknown")

        # Populate leave_type
        lt_id = r.get("leave_type_id")
        lt = db.leave_types.find_one({"_id": lt_id})
        if lt:
            r["leave_type"] = {
                "id": lt["_id"],
                "name": lt.get("name", "Leave"),
                "code": lt.get("code", "")
            }
            r["leave_type_name"] = lt.get("name", "Leave")
        else:
            r["leave_type"] = {
                "id": lt_id,
                "name": r.get("leave_type_name", "Leave"),
                "code": ""
            }
            r["leave_type_name"] = r.get("leave_type_name", "Leave")

        # Format dates
        for key in ["start_date", "end_date", "created_at", "updated_at", "applied_at"]:
            if key in r and hasattr(r[key], "isoformat"):
                r[key] = r[key].isoformat()
    return requests


@router.get("/requests")
def list_my_leaves(current_user=Depends(get_current_user),
                   status: str | None = None, year: int | None = None):
    db = get_mongo_db()
    emp = db.employees.find_one({"user_id": current_user["user_id"], "entity_id": current_user["entity_id"]})
    if not emp:
        return {"success": True, "data": [], "error": None}

    filt: dict = {"employee_id": emp["_id"]}
    if status:
        filt["status"] = status.upper()
    if year:
        filt["start_date"] = {"$gte": datetime(year, 1, 1), "$lt": datetime(year + 1, 1, 1)}

    requests = list(db.leave_requests.find(filt).sort("created_at", -1))
    enriched = _enrich_leave_requests(db, requests)
    return {"success": True, "data": enriched, "error": None}


@router.get("/requests/pending")
def list_pending_requests(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    accessible_ids = get_accessible_employee_ids(db, current_user)
    entity_id = current_user["entity_id"]
    role = (current_user.get("role") or "").upper()

    filt = {
        "entity_id": entity_id,
        "employee_id": {"$in": accessible_ids},
        "status": "PENDING",
    }
    if role in ("SUPER_ADMIN", "HR_ADMIN", "HR"):
        filt["hr_approved"] = {"$ne": True}
    else:
        filt["manager_approved"] = {"$ne": True}

    requests = list(db.leave_requests.find(filt).sort("created_at", -1))
    enriched = _enrich_leave_requests(db, requests)
    return {"success": True, "data": enriched, "error": None}


@router.get("/requests/team")
def list_team_leaves(current_user=Depends(get_current_user),
                     status: str | None = None):
    db = get_mongo_db()
    accessible_ids = get_accessible_employee_ids(db, current_user)
    entity_id = current_user["entity_id"]

    filt: dict = {"entity_id": entity_id, "employee_id": {"$in": accessible_ids}}
    if status:
        filt["status"] = status.upper()

    requests = list(db.leave_requests.find(filt).sort("created_at", -1).limit(100))
    enriched = _enrich_leave_requests(db, requests)
    return {"success": True, "data": enriched, "error": None}


@router.patch("/requests/{request_id}/approve")
def approve_leave(request_id: str, current_user=Depends(get_current_user),
                  _=Depends(require_permission(Permissions.LEAVE_APPROVE))):
    db = get_mongo_db()
    req = db.leave_requests.find_one({"_id": request_id})
    if not req:
        raise HTTPException(404, "Leave request not found")
    if req.get("status") != "PENDING":
        raise HTTPException(400, f"Cannot approve a request with status '{req.get('status')}'")

    # Get employee details to check manager
    emp = db.employees.find_one({"_id": req["employee_id"]})
    if not emp:
        raise HTTPException(400, "Employee record not found")

    manager_id = emp.get("manager_id")
    role = (current_user.get("role") or "").upper()
    user_emp = db.employees.find_one({"user_id": current_user["user_id"]})
    user_emp_id = user_emp["_id"] if user_emp else None

    # Track who is approving
    is_hr = role in ("SUPER_ADMIN", "HR_ADMIN", "HR")
    is_manager = user_emp_id and manager_id and (user_emp_id == manager_id)

    manager_approved = req.get("manager_approved", False)
    hr_approved = req.get("hr_approved", False)

    if is_hr:
        hr_approved = True
        # If no manager assigned, HR approval acts as manager approval too
        if not manager_id:
            manager_approved = True
    
    if is_manager:
        manager_approved = True

    # If the approver is neither HR nor manager, raise an error
    if not is_hr and not is_manager:
        raise HTTPException(403, "You are not authorized to approve this request (not the manager or HR)")

    updates = {
        "manager_approved": manager_approved,
        "hr_approved": hr_approved,
        "updated_at": datetime.utcnow(),
    }

    # Final approval check
    if manager_approved and hr_approved:
        updates["status"] = "APPROVED"
        updates["approved_by"] = current_user["user_id"]

        # Deduct balance
        days = req.get("days", 0)
        yr = req["start_date"].year if hasattr(req["start_date"], "year") else datetime.utcnow().year
        db.leave_balances.update_one(
            {"employee_id": req["employee_id"], "leave_type_id": req["leave_type_id"], "year": yr},
            {"$inc": {"used": days, "balance": -days}},
        )

        target_emp = db.employees.find_one({"_id": req["employee_id"]})
        target_user_id = target_emp.get("user_id") if target_emp else None
        if target_user_id:
            create_notification(
                user_id=target_user_id,
                title="Leave Approved",
                message=f"Your leave request has been approved.",
                notification_type="LEAVE",
                entity_id=current_user["entity_id"],
                link="/leaves/dashboard",
            )
    else:
        # Keep PENDING, but notify that it was partially approved
        approver_name = user_emp.get("full_name") if user_emp else "Admin/HR"
        target_emp = db.employees.find_one({"_id": req["employee_id"]})
        target_user_id = target_emp.get("user_id") if target_emp else None
        if target_user_id:
            create_notification(
                user_id=target_user_id,
                title="Leave Partially Approved",
                message=f"Your leave request was approved by {approver_name}. Pending final approval.",
                notification_type="LEAVE",
                entity_id=current_user["entity_id"],
                link="/leaves/dashboard",
            )

    db.leave_requests.update_one({"_id": request_id}, {"$set": updates})
    return {"success": True, "data": {"message": "Approval recorded"}, "error": None}


@router.patch("/requests/{request_id}/reject")
def reject_leave(request_id: str, current_user=Depends(get_current_user),
                 _=Depends(require_permission(Permissions.LEAVE_APPROVE))):
    db = get_mongo_db()
    req = db.leave_requests.find_one({"_id": request_id})
    if not req:
        raise HTTPException(404, "Leave request not found")
    if req.get("status") != "PENDING":
        raise HTTPException(400, f"Cannot reject a request with status '{req.get('status')}'")

    db.leave_requests.update_one({"_id": request_id}, {"$set": {
        "status": "REJECTED",
        "rejected_by": current_user["user_id"],
        "updated_at": datetime.utcnow(),
    }})

    # Notify requester
    target_emp = db.employees.find_one({"_id": req["employee_id"]})
    target_user_id = target_emp.get("user_id") if target_emp else None
    if target_user_id:
        create_notification(
            user_id=target_user_id,
            title="Leave Request Rejected",
            message="Your leave request has been rejected.",
            notification_type="LEAVE",
            entity_id=current_user["entity_id"],
            link="/leaves/dashboard",
        )

    return {"success": True, "data": {"message": "Leave rejected"}, "error": None}


@router.patch("/requests/{request_id}/cancel")
def cancel_leave(request_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    req = db.leave_requests.find_one({"_id": request_id})
    if not req:
        raise HTTPException(404, "Leave request not found")

    emp = db.employees.find_one({"user_id": current_user["user_id"]})
    if not emp or emp["_id"] != req.get("employee_id"):
        raise HTTPException(403, "You can only cancel your own leave requests")

    if req.get("status") not in ("PENDING", "APPROVED"):
        raise HTTPException(400, "Cannot cancel this request")

    was_approved = req.get("status") == "APPROVED"
    db.leave_requests.update_one({"_id": request_id}, {"$set": {
        "status": "CANCELLED", "updated_at": datetime.utcnow(),
    }})

    # Notify manager if approved leave was cancelled
    if was_approved and emp.get("manager_user_id"):
        create_notification(
            user_id=emp["manager_user_id"],
            title="Approved Leave Cancelled",
            message=f"{emp.get('full_name')} cancelled their approved leave request.",
            notification_type="LEAVE",
            entity_id=current_user["entity_id"],
            link="/leaves/manage",
        )

    # Restore balance if it was approved
    if was_approved:
        days = req.get("days", 0)
        yr = req["start_date"].year if hasattr(req["start_date"], "year") else datetime.utcnow().year
        db.leave_balances.update_one(
            {"employee_id": req["employee_id"], "leave_type_id": req["leave_type_id"], "year": yr},
            {"$inc": {"used": -days, "balance": days}},
        )

    return {"success": True, "data": {"message": "Leave cancelled"}, "error": None}


def get_sundays_and_second_saturdays(year: int, month: int | None = None) -> list[date]:
    """Return all Sundays and the second Saturday for a given year (and optionally a specific month)."""
    results = []
    months = [month] if month is not None else list(range(1, 13))
    for m in months:
        saturdays_count = 0
        for d_num in range(1, 32):
            try:
                dt = date(year, m, d_num)
                # In Python weekday(): 5 is Saturday, 6 is Sunday
                if dt.weekday() == 6:
                    results.append(dt)
                elif dt.weekday() == 5:
                    saturdays_count += 1
                    if saturdays_count == 2:
                        results.append(dt)
            except ValueError:
                # Invalid day for this month (e.g. Feb 30)
                break
    return results


@router.get("/holidays")
def list_holidays(current_user=Depends(get_current_user), year: int | None = None):
    db = get_mongo_db()
    filt: dict = {"entity_id": current_user["entity_id"]}
    yr = year or datetime.utcnow().year
    if year:
        filt["date"] = {"$gte": datetime(yr, 1, 1), "$lt": datetime(yr + 1, 1, 1)}

    holidays = list(db.holidays.find(filt).sort("date", 1))
    for h in holidays:
        h.pop("_id", None)
        if "date" in h and hasattr(h["date"], "isoformat"):
            h["date"] = h["date"].strftime("%Y-%m-%d")

    # Add Sundays and second Saturdays dynamically
    dyn_dates = get_sundays_and_second_saturdays(yr)
    existing_dates = {h["date"] for h in holidays}
    for dt in dyn_dates:
        dt_str = dt.strftime("%Y-%m-%d")
        if dt_str not in existing_dates:
            name = "Sunday Public Holiday" if dt.weekday() == 6 else "Second Saturday Public Holiday"
            holidays.append({
                "name": name,
                "date": dt_str,
                "is_optional": False
            })

    # Sort holidays by date
    holidays.sort(key=lambda x: x["date"])
    return {"success": True, "data": holidays, "error": None}


@router.post("/holidays")
def create_holiday(payload: HolidayCreate, current_user=Depends(get_current_user),
                   _=Depends(require_permission(Permissions.ENTITY_MANAGE))):
    db = get_mongo_db()
    hid = str(uuid4())
    doc = {
        "_id": hid, "id": hid,
        "entity_id": current_user["entity_id"],
        "name": payload.name,
        "date": _str_to_date(payload.date),
        "is_optional": payload.is_optional,
    }
    db.holidays.insert_one(doc)
    doc.pop("_id", None)
    doc["date"] = payload.date
    return {"success": True, "data": doc, "error": None}


@router.delete("/holidays/{holiday_id}")
def delete_holiday(holiday_id: str, current_user=Depends(get_current_user),
                   _=Depends(require_permission(Permissions.ENTITY_MANAGE))):
    db = get_mongo_db()
    result = db.holidays.delete_one({"_id": holiday_id, "entity_id": current_user["entity_id"]})
    if result.deleted_count == 0:
        raise HTTPException(404, "Holiday not found")
    return {"success": True, "data": {"message": "Holiday deleted"}, "error": None}


# ═══════════════ LEAVE STATS ═══════════════

@router.get("/stats")
def get_leave_stats(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    emp = db.employees.find_one({"user_id": current_user["user_id"], "entity_id": current_user["entity_id"]})
    if not emp:
        return {"success": True, "data": {
            "total_entitled": 0, "total_available": 0,
            "total_used": 0,
            "total_balance": 0, "total_remaining": 0,
            "pending_requests": 0
        }, "error": None}

    yr = datetime.utcnow().year
    balances = list(db.leave_balances.find({"employee_id": emp["_id"], "year": yr}))
    total_entitled = sum(b.get("entitled", 0) for b in balances)
    total_used = sum(b.get("used", 0) for b in balances)
    total_balance = sum(b.get("balance", 0) for b in balances)

    pending = db.leave_requests.count_documents({"employee_id": emp["_id"], "status": "PENDING"})

    return {
        "success": True,
        "data": {
            "total_entitled": total_entitled,
            "total_available": total_entitled,
            "total_used": total_used,
            "total_balance": total_balance,
            "total_remaining": total_balance,
            "pending_requests": pending,
        },
        "error": None,
    }


@router.get("/stats/me")
def get_my_leave_stats(current_user=Depends(get_current_user)):
    return get_leave_stats(current_user=current_user)



# ═══════════════ CALENDAR ═══════════════

@router.get("/calendar")
def get_leave_calendar(current_user=Depends(get_current_user),
                       month: int | None = None, year: int | None = None):
    db = get_mongo_db()
    accessible_ids = get_accessible_employee_ids(db, current_user)
    entity_id = current_user["entity_id"]

    yr = year or datetime.utcnow().year
    mn = month or datetime.utcnow().month

    start = datetime(yr, mn, 1)
    end = datetime(yr, mn + 1, 1) if mn < 12 else datetime(yr + 1, 1, 1)

    filt = {
        "entity_id": entity_id,
        "employee_id": {"$in": accessible_ids},
        "status": {"$in": ["APPROVED", "PENDING"]},
        "start_date": {"$lt": end},
        "end_date": {"$gte": start},
    }

    requests = list(db.leave_requests.find(filt))
    events = []
    for r in requests:
        emp = db.employees.find_one({"_id": r.get("employee_id")})
        name = emp.get("full_name") if emp else "Unknown"
        lt_name = r.get("leave_type_name", "Leave")
        color = "#10B981" if r.get("status") == "APPROVED" else "#F59E0B"
        
        events.append({
            "id": r.get("id", str(r["_id"])),
            "title": f"{name} - {lt_name}",
            "employee_name": name,
            "leave_type": lt_name,
            "event_type": "LEAVE",
            "start_date": r["start_date"].strftime("%Y-%m-%d") if hasattr(r["start_date"], "strftime") else str(r["start_date"]),
            "end_date": r["end_date"].strftime("%Y-%m-%d") if hasattr(r["end_date"], "strftime") else str(r["end_date"]),
            "status": r.get("status"),
            "days": r.get("days", 0),
            "color": color
        })

    # Holidays
    holidays = list(db.holidays.find({
        "entity_id": entity_id,
        "date": {"$gte": start, "$lt": end},
    }))
    holiday_events = []
    existing_holiday_dates = set()
    for h in holidays:
        dt_str = h["date"].strftime("%Y-%m-%d") if hasattr(h["date"], "strftime") else str(h["date"])
        existing_holiday_dates.add(dt_str)
        holiday_events.append({
            "id": h.get("id", str(h["_id"])),
            "title": h.get("name", "Public Holiday"),
            "employee_name": "Company Holiday",
            "leave_type": "HOLIDAY",
            "event_type": "HOLIDAY",
            "start_date": dt_str,
            "end_date": dt_str,
            "status": "HOLIDAY",
            "days": 1,
            "holiday_name": h.get("name"),
            "color": "#3B82F6"
        })

    # Add Sundays and second Saturdays
    dyn_dates = get_sundays_and_second_saturdays(yr, mn)
    for dt in dyn_dates:
        dt_str = dt.strftime("%Y-%m-%d")
        if dt_str not in existing_holiday_dates:
            name = "Sunday Public Holiday" if dt.weekday() == 6 else "Second Saturday Public Holiday"
            holiday_events.append({
                "id": f"dyn-hol-{dt_str}",
                "title": name,
                "employee_name": "Company Holiday",
                "leave_type": "HOLIDAY",
                "event_type": "HOLIDAY",
                "start_date": dt_str,
                "end_date": dt_str,
                "status": "HOLIDAY",
                "days": 1,
                "holiday_name": name,
                "color": "#3B82F6"
            })
    
    events.extend(holiday_events)
    return {"success": True, "data": events, "error": None}


# ═══════════════ ALIAS ROUTES ═══════════════

class LeaveApprovePayload(BaseModel):
    action: str
    remarks: str | None = None


@alias_router.get("/types")
def alias_list_types(current_user=Depends(get_current_user)):
    return list_leave_types(current_user=current_user)

@alias_router.get("/balances")
def alias_get_balances(current_user=Depends(get_current_user)):
    return get_my_balances(current_user=current_user)

@alias_router.get("/requests")
def alias_list_requests(current_user=Depends(get_current_user)):
    return list_my_leaves(current_user=current_user)

@alias_router.get("/stats")
def alias_get_stats(current_user=Depends(get_current_user)):
    return get_leave_stats(current_user=current_user)

@alias_router.get("/holidays")
def alias_list_holidays(current_user=Depends(get_current_user)):
    return list_holidays(current_user=current_user)

@alias_router.get("/calendar")
def alias_get_calendar(current_user=Depends(get_current_user)):
    return get_leave_calendar(current_user=current_user)

@alias_router.get("/requests/pending")
def alias_pending(current_user=Depends(get_current_user)):
    return list_pending_requests(current_user=current_user)

@alias_router.get("/requests/team")
def alias_team(current_user=Depends(get_current_user)):
    return list_team_leaves(current_user=current_user)

# ── COMPATIBILITY ALIASES ──

@alias_router.get("/")
@alias_router.get("")
def alias_get_leaves(
    current_user=Depends(get_current_user),
    employee_id: str | None = None,
    status: str | None = None,
    year: int | None = None
):
    db = get_mongo_db()
    if not employee_id:
        emp = db.employees.find_one({"user_id": current_user["user_id"], "entity_id": current_user["entity_id"]})
        if not emp:
            return {"success": True, "data": [], "error": None}
        employee_id = emp["_id"]

    filt: dict = {"employee_id": employee_id}
    if status:
        filt["status"] = status.upper()
    if year:
        filt["start_date"] = {"$gte": datetime(year, 1, 1), "$lt": datetime(year + 1, 1, 1)}

    requests = list(db.leave_requests.find(filt).sort("created_at", -1))
    enriched = _enrich_leave_requests(db, requests)
    return {"success": True, "data": enriched, "error": None}


@alias_router.post("/")
@alias_router.post("")
def alias_apply_leave(payload: LeaveRequestCreate, current_user=Depends(get_current_user)):
    return apply_leave(payload=payload, current_user=current_user)


@alias_router.post("/{request_id}/approve")
def alias_approve_leave_action(
    request_id: str,
    payload: LeaveApprovePayload,
    current_user=Depends(get_current_user)
):
    if payload.action == "APPROVED":
        return approve_leave(request_id=request_id, current_user=current_user)
    else:
        return reject_leave(request_id=request_id, current_user=current_user)


@alias_router.get("/balance/{employee_id}")
def alias_get_employee_balances(employee_id: str, current_user=Depends(get_current_user), year: int | None = None):
    return get_employee_balances(employee_id=employee_id, current_user=current_user, year=year)


@router.post("/{request_id}/cancel")
def post_cancel_leave(request_id: str, current_user=Depends(get_current_user)):
    return cancel_leave(request_id=request_id, current_user=current_user)

