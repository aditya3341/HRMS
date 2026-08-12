"""Payroll API — native MongoDB."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime
from uuid import uuid4

from app.core.mongodb import get_mongo_db
from app.auth.deps import get_current_user
from app.auth.constants import Permissions
from app.auth.permission import require_permission
from app.utils.abac import get_accessible_employee_ids
from app.utils.audit import log_audit
from app.utils.notification_service import create_notification

router = APIRouter(prefix="/payroll", tags=["Payroll"])


class PayrollRunCreate(BaseModel):
    month: int
    year: int


@router.get("/salary-structures", dependencies=[Depends(require_permission(Permissions.PAYROLL_READ))])
def list_salary_structures(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    entity_id = current_user["entity_id"]
    structures = list(db.salary_structures.find({"entity_id": entity_id, "is_active": True}))
    result = []
    for s in structures:
        emp = db.employees.find_one({"_id": s.get("employee_id")})
        result.append({
            "id": s.get("id", s["_id"]),
            "employee_id": s.get("employee_id"),
            "employee_name": emp.get("full_name") if emp else "Unknown",
            "basic": s.get("basic", 0),
            "hra": s.get("hra", 0),
            "da": s.get("da", 0),
            "special_allowance": s.get("special_allowance", 0),
            "gross": s.get("gross", 0),
            "pf_deduction": s.get("pf_deduction", 0),
            "tax_deduction": s.get("tax_deduction", 0),
        })
    return {"success": True, "data": result, "error": None}


@router.get("/salary-structures/{employee_id}")
def get_salary_structure(employee_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    structure = db.salary_structures.find_one({"employee_id": employee_id, "is_active": True})
    if not structure:
        raise HTTPException(404, "Salary structure not found")
    structure.pop("_id", None)
    if "effective_from" in structure and hasattr(structure["effective_from"], "isoformat"):
        structure["effective_from"] = structure["effective_from"].isoformat()
    return {"success": True, "data": structure, "error": None}


@router.get("/runs", dependencies=[Depends(require_permission(Permissions.PAYROLL_READ))])
def list_payroll_runs(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    runs = list(db.payroll_runs.find({"entity_id": current_user["entity_id"]}).sort("created_at", -1))
    for r in runs:
        r.pop("_id", None)
        for key in ["created_at"]:
            if key in r and hasattr(r[key], "isoformat"):
                r[key] = r[key].isoformat()
    return {"success": True, "data": runs, "error": None}


@router.get("/me/payslips")
def get_my_payslips(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    employee_id = current_user.get("employee_id")
    if not employee_id:
        return {"success": True, "data": [], "error": None}
    
    entries = list(db.payroll_entries.find({"employee_id": employee_id}))
    for e in entries:
        e.pop("_id", None)
        run = db.payroll_runs.find_one({"_id": e.get("payroll_run_id")})
        if run:
            e["month"] = run.get("month")
            e["year"] = run.get("year")
            e["run_status"] = run.get("status")
            e["total_net"] = e.get("net_pay", 0)
            e["id"] = e.get("payroll_run_id")
            
    entries.sort(key=lambda x: (x.get("year", 0), x.get("month", 0)), reverse=True)
    return {"success": True, "data": entries, "error": None}



@router.post("/run", dependencies=[Depends(require_permission(Permissions.PAYROLL_RUN))])
def run_payroll(payload: PayrollRunCreate, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    entity_id = current_user["entity_id"]

    # Check if run already exists
    existing = db.payroll_runs.find_one({
        "entity_id": entity_id, "month": payload.month, "year": payload.year,
    })
    if existing:
        raise HTTPException(400, f"Payroll already run for {payload.month}/{payload.year}")

    run_id = str(uuid4())
    employees = list(db.employees.find({"entity_id": entity_id, "status": "ACTIVE"}))
    entries = []

    for emp in employees:
        sal = db.salary_structures.find_one({"employee_id": emp["_id"], "is_active": True})
        if not sal:
            continue

        gross = sal.get("gross", 0)
        deductions = sal.get("pf_deduction", 0) + sal.get("tax_deduction", 0)

        # Check LOP (days of Loss of Pay leave)
        lop_days = 0
        lop_leaves = list(db.leave_requests.find({
            "employee_id": emp["_id"],
            "status": "APPROVED",
            "start_date": {"$gte": datetime(payload.year, payload.month, 1)},
        }))
        for lr in lop_leaves:
            lt = db.leave_types.find_one({"_id": lr.get("leave_type_id")})
            if lt and not lt.get("is_paid"):
                lop_days += lr.get("days", 0)

        lop_deduction = round((gross / 30) * lop_days) if lop_days > 0 else 0
        net_pay = gross - deductions - lop_deduction

        entry_id = str(uuid4())
        entry = {
            "_id": entry_id, "id": entry_id,
            "payroll_run_id": run_id,
            "employee_id": emp["_id"],
            "employee_name": emp.get("full_name"),
            "employee_code": emp.get("employee_code"),
            "basic": sal.get("basic", 0),
            "hra": sal.get("hra", 0),
            "da": sal.get("da", 0),
            "special_allowance": sal.get("special_allowance", 0),
            "gross": gross,
            "pf_deduction": sal.get("pf_deduction", 0),
            "tax_deduction": sal.get("tax_deduction", 0),
            "lop_days": lop_days,
            "lop_deduction": lop_deduction,
            "net_pay": net_pay,
        }
        entries.append(entry)

    if entries:
        db.payroll_entries.insert_many(entries)

    run_doc = {
        "_id": run_id, "id": run_id,
        "entity_id": entity_id,
        "month": payload.month,
        "year": payload.year,
        "status": "DRAFT",
        "total_employees": len(entries),
        "total_gross": sum(e["gross"] for e in entries),
        "total_net": sum(e["net_pay"] for e in entries),
        "created_at": datetime.utcnow(),
        "created_by": current_user["user_id"],
    }
    db.payroll_runs.insert_one(run_doc)

    log_audit(user=current_user, action="PAYROLL_RUN", module="Payroll",
              resource_type="PayrollRun", resource_id=run_id)

    run_doc.pop("_id", None)
    run_doc["created_at"] = run_doc["created_at"].isoformat()
    return {"success": True, "data": run_doc, "error": None}


@router.get("/runs/{run_id}/entries")
def get_payroll_entries(run_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    entries = list(db.payroll_entries.find({"payroll_run_id": run_id}))
    for e in entries:
        e.pop("_id", None)
    return {"success": True, "data": entries, "error": None}


@router.get("/runs/{run_id}/payslip/{employee_id}")
def get_payslip(run_id: str, employee_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    entry = db.payroll_entries.find_one({"payroll_run_id": run_id, "employee_id": employee_id})
    if not entry:
        raise HTTPException(404, "Payslip not found")
    entry.pop("_id", None)

    run = db.payroll_runs.find_one({"_id": run_id})
    entry["month"] = run.get("month") if run else None
    entry["year"] = run.get("year") if run else None
    entry["run_status"] = run.get("status") if run else None

    return {"success": True, "data": entry, "error": None}


@router.patch("/runs/{run_id}/lock", dependencies=[Depends(require_permission(Permissions.PAYROLL_RUN))])
def lock_payroll(run_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    db.payroll_runs.update_one({"_id": run_id}, {"$set": {"status": "LOCKED"}})
    return {"success": True, "data": {"message": "Payroll locked"}, "error": None}


@router.patch("/runs/{run_id}/pay", dependencies=[Depends(require_permission(Permissions.PAYROLL_RUN))])
def mark_paid(run_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    db.payroll_runs.update_one({"_id": run_id}, {"$set": {"status": "PAID"}})
    
    # Notify employees that their payslip has been released
    run = db.payroll_runs.find_one({"_id": run_id})
    month = run.get("month") if run else "??"
    year = run.get("year") if run else "??"
    
    entries = list(db.payroll_entries.find({"payroll_run_id": run_id}))
    for e in entries:
        emp = db.employees.find_one({"_id": e.get("employee_id")})
        if emp and emp.get("user_id"):
            create_notification(
                user_id=emp["user_id"],
                title="Payslip Released",
                message=f"Your payslip for {month}/{year} has been released. You can now view/download it.",
                notification_type="INFO",
                entity_id=current_user["entity_id"],
                link=f"/payroll/payslip/{run_id}/{emp['_id']}",
            )
            
    return {"success": True, "data": {"message": "Payroll marked as paid"}, "error": None}
