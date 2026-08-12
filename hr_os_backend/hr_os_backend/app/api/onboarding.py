"""Onboarding API — native MongoDB."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime
from uuid import uuid4

from app.core.mongodb import get_mongo_db
from app.auth.deps import get_current_user
from app.auth.constants import Permissions
from app.auth.permission import require_permission
from app.utils.notification_service import create_notification
from app.utils.audit import log_audit

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])

@router.get("/", dependencies=[Depends(require_permission(Permissions.ONBOARDING_READ))])
def list_onboarding(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    employees = list(db.employees.find({
        "entity_id": current_user["entity_id"],
        "status": {"$in": ["ONBOARDING", "ACTIVE"]},
    }).sort("date_of_joining", -1))

    result = []
    for emp in employees:
        dept = None
        if emp.get("department_id"):
            dept_doc = db.departments.find_one({"_id": emp["department_id"]})
            dept = dept_doc["name"] if dept_doc else None
        result.append({
            "id": emp["_id"],
            "full_name": emp.get("full_name"),
            "email": emp.get("email"),
            "employee_code": emp.get("employee_code"),
            "status": emp.get("status"),
            "department": dept,
            "designation": emp.get("designation"),
            "documents_uploaded": emp.get("documents_uploaded", False),
            "policies_accepted": emp.get("policies_accepted", False),
            "biometric_id": emp.get("biometric_id"),
            "date_of_joining": emp["date_of_joining"].isoformat() if emp.get("date_of_joining") and hasattr(emp["date_of_joining"], "isoformat") else None,
        })

    return {"success": True, "data": result, "error": None}

@router.get("/{employee_id}", dependencies=[Depends(require_permission(Permissions.ONBOARDING_READ))])
def get_onboarding_detail(employee_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    emp = db.employees.find_one({"_id": employee_id, "entity_id": current_user["entity_id"]})
    if not emp:
        raise HTTPException(404, "Employee not found")

    dept = None
    if emp.get("department_id"):
        dept_doc = db.departments.find_one({"_id": emp["department_id"]})
        dept = dept_doc["name"] if dept_doc else None

    # Get offer info
    offer = None
    if emp.get("application_id"):
        offer = db.offers.find_one({"application_id": emp["application_id"]})

    pan_ok = bool(emp.get("pan"))
    aadhaar_ok = bool(emp.get("aadhaar"))
    bank_ok = bool(emp.get("bank_account"))
    policies_ok = bool(emp.get("policies_accepted", False))
    hr_ok = bool(emp.get("manager_id"))
    it_ok = True

    can_activate = pan_ok and aadhaar_ok and bank_ok and policies_ok and hr_ok

    data = {
        "id": emp["_id"],
        "status": emp.get("status"),
        "can_activate": can_activate,
        "manager_id": emp.get("manager_id"),
        "documents": {
            "pan": pan_ok,
            "aadhaar": aadhaar_ok,
            "bank": bank_ok
        },
        "policies": {
            "completed": policies_ok
        },
        "hr": {
            "completed": hr_ok,
            "manager_id": emp.get("manager_id")
        },
        "it": {
            "completed": it_ok
        },
        "employee": {
            "id": emp["_id"],
            "full_name": emp.get("full_name"),
            "email": emp.get("email"),
            "employee_code": emp.get("employee_code"),
            "status": emp.get("status"),
            "department": dept,
            "designation": emp.get("designation") or (offer.get("designation") if offer else "Staff"),
            "date_of_joining": emp["date_of_joining"].isoformat() if emp.get("date_of_joining") and hasattr(emp["date_of_joining"], "isoformat") else None,
            "pan": emp.get("pan"),
            "aadhaar": emp.get("aadhaar"),
            "uan": emp.get("uan"),
            "bank_account": emp.get("bank_account"),
            "biometric_id": emp.get("biometric_id"),
            "documents_uploaded": emp.get("documents_uploaded", False),
            "policies_accepted": emp.get("policies_accepted", False),
        }
    }

    return {"success": True, "data": data, "error": None}


@router.patch("/{employee_id}/complete", dependencies=[Depends(require_permission(Permissions.ONBOARDING_MANAGE))])
def complete_onboarding(employee_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    emp = db.employees.find_one({"_id": employee_id, "entity_id": current_user["entity_id"]})
    if not emp:
        raise HTTPException(404, "Employee not found")

    db.employees.update_one({"_id": employee_id}, {"$set": {"status": "ACTIVE"}})
    
    # Notify employee
    if emp.get("user_id"):
        create_notification(
            user_id=emp["user_id"],
            title="Onboarding Completed",
            message="Your onboarding is completed! You are now an active team member.",
            notification_type="INFO",
            entity_id=current_user["entity_id"],
            link="/dashboard/me",
        )
        
    log_audit(user=current_user, action="ONBOARDING_COMPLETED", module="Onboarding",
              resource_type="Employee", resource_id=employee_id)

    return {"success": True, "data": {"message": "Onboarding completed", "status": "ACTIVE"}, "error": None}

@router.patch("/{employee_id}/policies", dependencies=[Depends(get_current_user)])
def accept_policies(employee_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    db.employees.update_one({"_id": employee_id}, {"$set": {"policies_accepted": True}})
    return {"success": True, "data": {"message": "Policies accepted"}, "error": None}
