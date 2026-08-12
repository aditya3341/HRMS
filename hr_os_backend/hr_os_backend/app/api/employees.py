"""Employees API — full CRUD with native MongoDB."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime
from uuid import uuid4

from app.auth.deps import get_current_user
from app.auth.constants import Permissions
from app.auth.permission import require_permission
from app.core.mongodb import get_mongo_db
from app.utils.abac import get_accessible_employee_ids
from app.utils.db_helpers import validate_entity_match
from app.utils.audit import log_audit
from app.utils.identifiers import identity_filter
from app.models.enums import EmployeeStatus, AuditAction

router = APIRouter(prefix="/employees", tags=["Employees"])


class EmployeeUpdate(BaseModel):
    pan: str | None = None
    aadhaar: str | None = None
    bank_account: str | None = None
    manager_id: str | None = None
    user_id: str | None = None
    department_id: str | None = None
    status: str | None = None
    phone: str | None = None
    address: str | None = None
    emergency_contact: str | None = None
    designation: str | None = None
    full_name: str | None = None
    email: str | None = None
    employee_code: str | None = None
    avatar_url: str | None = None
    banner_url: str | None = None
    
    first_name: str | None = None
    last_name: str | None = None
    nick_name: str | None = None
    source_of_hire: str | None = None
    seating_location: str | None = None
    employee_type: str | None = None
    work_phone: str | None = None
    extension: str | None = None
    work_role: str | None = None
    other_email: str | None = None
    birth_date: str | None = None
    marital_status: str | None = None
    bank_name: str | None = None
    account_type: str | None = None
    bank_holder_name: str | None = None
    ifsc_code: str | None = None
    payment_mode: str | None = None
    job_description: str | None = None
    about_me: str | None = None
    expertise: str | None = None
    gender: str | None = None
    fathers_name: str | None = None
    work_experience: list | None = None
    education: list | None = None
    dependents: list | None = None


class EmployeeCreate(BaseModel):
    full_name: str
    email: str
    role: str
    department_id: str | None = None
    employee_code: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    designation: str | None = None
    avatar_url: str | None = None
    date_of_joining: str | None = None
    seating_location: str | None = None
    work_phone: str | None = None
    extension: str | None = None
    other_email: str | None = None
    manager_id: str | None = None
    birth_date: str | None = None
    phone: str | None = None
    marital_status: str | None = None
    about_me: str | None = None
    tags: str | None = None
    nick_name: str | None = None
    expertise: str | None = None
    gender: str | None = None


# ── GET /employees/me ─────────────────────────────────────────
@router.get("/me")
def get_my_employee_profile(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    employee = db.employees.find_one({
        "user_id": current_user["user_id"],
        "entity_id": current_user["entity_id"],
    })
    if not employee:
        raise HTTPException(status_code=404, detail="Employee record not found for current user.")
    return get_employee_profile(employee["_id"], current_user)


# ── GET /employees/unmapped-users ─────────────────────────────
@router.get("/unmapped-users", dependencies=[Depends(require_permission(Permissions.EMPLOYEE_VIEW))])
def get_unmapped_users(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    entity_id = current_user["entity_id"]

    mapped_user_ids = set()
    for emp in db.employees.find({"entity_id": entity_id, "user_id": {"$ne": None}}, {"user_id": 1}):
        mapped_user_ids.add(emp["user_id"])

    unmapped = []
    for user in db.users.find({"entity_id": entity_id}):
        if user["_id"] not in mapped_user_ids:
            unmapped.append({"id": user["_id"], "email": user.get("email")})

    return {"success": True, "data": unmapped, "error": None}


# ── GET /employees/lookup ─────────────────────────────────────
@router.get("/lookup", dependencies=[Depends(require_permission(Permissions.EMPLOYEE_VIEW))])
def lookup_employees(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    accessible_ids = get_accessible_employee_ids(db, current_user)
    entity_id = current_user["entity_id"]

    employees = db.employees.find({
        "entity_id": entity_id,
        "_id": {"$in": accessible_ids},
        "status": {"$ne": "EXITED"},
    }).sort("full_name", 1)

    seen = set()
    result = []
    for emp in employees:
        name = emp.get("full_name", "")
        if name not in seen:
            seen.add(name)
            result.append({"id": emp["_id"], "full_name": name})

    return {"success": True, "data": result, "error": None}


# ── GET /employees/ ───────────────────────────────────────────
@router.get("/", dependencies=[Depends(require_permission(Permissions.EMPLOYEE_VIEW))])
def list_employees(current_user=Depends(get_current_user), skip: int = 0, limit: int = 1000):
    db = get_mongo_db()
    accessible_ids = get_accessible_employee_ids(db, current_user)
    entity_id = current_user["entity_id"]

    filt = {"entity_id": entity_id, "_id": {"$in": accessible_ids}}
    total_count = db.employees.count_documents(filt)

    employees = (
        db.employees.find(filt)
        .sort("full_name", 1)
        .skip(skip)
        .limit(limit)
    )

    data = []
    for emp in employees:
        dept = None
        if emp.get("department_id"):
            dept_doc = db.departments.find_one({"_id": emp["department_id"]})
            dept = dept_doc["name"] if dept_doc else None
        data.append({
            "id": emp["_id"],
            "full_name": emp.get("full_name", ""),
            "email": emp.get("email", ""),
            "status": emp.get("status", ""),
            "employee_code": emp.get("employee_code", ""),
            "designation": emp.get("designation", ""),
            "department": dept,
            "documents_uploaded": emp.get("documents_uploaded", False),
            "avatar_url": emp.get("avatar_url"),
        })

    return {"success": True, "data": data, "total_count": total_count, "error": None}


def verify_profile_access(employee_id: str, current_user: dict):
    db = get_mongo_db()
    role = (current_user.get("role") or "EMPLOYEE").upper()
    entity_id = current_user.get("entity_id")
    user_id = current_user.get("user_id")

    # Super admin, HR admin, HR, admin bypass checks
    if role in ("SUPER_ADMIN", "HR_ADMIN", "HR", "ADMIN"):
        return

    # Find the current user's employee record
    me = db.employees.find_one({"user_id": user_id, "entity_id": entity_id})
    if not me:
        raise HTTPException(status_code=403, detail="No employee record found for user.")

    my_id = me["_id"]

    # Check if this is their own profile
    if employee_id == my_id:
        # Load profile config to see if self profile view is allowed
        config_doc = db.system_configs.find_one({"config_key": "PROFILE_CONFIG", "entity_id": entity_id})
        config_val = config_doc["config_value"] if config_doc else {
            "allow_self_profile_view": True,
            "allowed_employee_ids": [],
            "allowed_roles": ["SUPER_ADMIN", "HR_ADMIN", "HR", "ADMIN", "MANAGER", "EMPLOYEE"]
        }

        # Check if self profile view is disabled globally
        if not config_val.get("allow_self_profile_view", True):
            raise HTTPException(status_code=403, detail="Self profile viewing is disabled by the Super Admin.")

        # Check if allowed roles / employee IDs are restricted
        allowed_roles = config_val.get("allowed_roles", [])
        allowed_employee_ids = config_val.get("allowed_employee_ids", [])

        if allowed_roles and role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Your role is not allowed to view profiles.")
        if allowed_employee_ids and my_id not in allowed_employee_ids:
            raise HTTPException(status_code=403, detail="You are not authorized to view your profile.")
        return

    # Check if they are a manager and this is a subordinate
    accessible_ids = get_accessible_employee_ids(db, current_user)
    if employee_id in accessible_ids:
        return

    raise HTTPException(status_code=403, detail="You do not have permission to access this profile.")


# ── GET /employees/{employee_id} ──────────────────────────────
@router.get("/{employee_id}")
def get_employee(employee_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    emp = db.employees.find_one(identity_filter(employee_id, "_id", "id", "user_id"))
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    verify_profile_access(emp["_id"], current_user)

    return {
        "success": True,
        "data": {
            "id": emp["_id"],
            "full_name": emp.get("full_name"),
            "email": emp.get("email"),
            "status": emp.get("status"),
            "employee_code": emp.get("employee_code"),
            "pan": emp.get("pan"),
            "aadhaar": emp.get("aadhaar"),
            "bank_account": emp.get("bank_account"),
            "documents_uploaded": emp.get("documents_uploaded", False),
            "policies_accepted": emp.get("policies_accepted", False),
            "onboarding_status": emp.get("status"),
        },
        "error": None,
    }


# ── PATCH /employees/{employee_id} ────────────────────────────
@router.patch("/{employee_id}", dependencies=[Depends(require_permission(Permissions.EMPLOYEE_VIEW))])
def update_employee(employee_id: str, payload: EmployeeUpdate, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    emp = db.employees.find_one(identity_filter(employee_id, "_id", "id", "user_id"))
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    accessible_ids = get_accessible_employee_ids(db, current_user)
    if emp["_id"] not in accessible_ids and emp.get("id") not in accessible_ids and employee_id not in accessible_ids:
        raise HTTPException(status_code=403, detail="You do not have permission to update this employee.")

    validate_entity_match(emp.get("entity_id"), current_user["entity_id"])

    # Enforce basic info fields check
    role = (current_user.get("role") or "").strip().upper()
    is_hr_or_super = role in ("SUPER_ADMIN", "HR_ADMIN")
    
    basic_info_fields = {
        "pan", "aadhaar", "bank_account", "manager_id", "user_id",
        "department_id", "status", "designation", "full_name", "first_name", "last_name",
        "source_of_hire", "seating_location", "employee_type", "work_phone", "extension",
        "work_role", "bank_name", "account_type", "bank_holder_name", "ifsc_code", "payment_mode",
        "email", "employee_code"
    }

    if not is_hr_or_super:
        for field in basic_info_fields:
            val = getattr(payload, field, None)
            if val is not None:
                existing_val = emp.get(field)
                if val != existing_val:
                    raise HTTPException(
                        status_code=403,
                        detail=f"Permission denied: Only HR or SuperAdmin can edit basic or financial details ('{field}')."
                    )

    update_fields = {}
    for field in ["pan", "aadhaar", "bank_account", "manager_id", "user_id",
                   "department_id", "phone", "address", "emergency_contact",
                   "designation", "full_name", "avatar_url", "banner_url", "first_name", "last_name", "nick_name",
                   "source_of_hire", "seating_location", "employee_type", "work_phone", "extension",
                   "work_role", "other_email", "birth_date", "marital_status", "bank_name", "account_type",
                   "bank_holder_name", "ifsc_code", "payment_mode", "job_description", "about_me",
                   "expertise", "gender", "fathers_name", "work_experience", "education", "dependents",
                   "email", "employee_code"]:
        val = getattr(payload, field, None)
        if val is not None:
            update_fields[field] = val if val != "" else None

    # Sync email to users collection if updated
    if payload.email is not None:
        u_id = emp.get("user_id")
        if u_id:
            db.users.update_one({"_id": u_id}, {"$set": {"email": payload.email.strip().lower()}})

    if payload.status is not None:
        update_fields["status"] = str(payload.status).upper()

    if payload.manager_id is not None:
        mgr_id = payload.manager_id if payload.manager_id != "" else None
        update_fields["manager_id"] = mgr_id
        if mgr_id:
            mgr_emp = db.employees.find_one({"_id": mgr_id})
            update_fields["manager_user_id"] = mgr_emp.get("user_id") if mgr_emp else None
        else:
            update_fields["manager_user_id"] = None

    if update_fields:
        db.employees.update_one({"_id": employee_id}, {"$set": update_fields})

    log_audit(
        user=current_user,
        action=AuditAction.EMPLOYEE_UPDATED,
        module="HR",
        resource_type="Employee",
        resource_id=employee_id,
        new_values=update_fields,
    )

    return {"success": True, "data": {"message": "Employee updated successfully"}, "error": None}


# ── POST /employees/{employee_id}/onboarding/start ────────────
@router.post("/{employee_id}/onboarding/start", dependencies=[Depends(require_permission(Permissions.ONBOARDING_START))])
def start_onboarding(employee_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    emp = db.employees.find_one(identity_filter(employee_id, "_id", "id", "user_id"))
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    validate_entity_match(emp.get("entity_id"), current_user["entity_id"])

    db.employees.update_one({"_id": employee_id}, {"$set": {"status": "ONBOARDING"}})

    return {
        "success": True,
        "data": {"message": "Onboarding started", "employee_id": employee_id, "status": "ONBOARDING"},
        "error": None,
    }


# ── GET /employees/{employee_id}/profile ──────────────────────
@router.get("/{employee_id}/profile")
def get_employee_profile(employee_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    
    if employee_id == "00000000-0000-0000-0000-000000000000":
        emp = db.employees.find_one({"user_id": current_user["user_id"], "entity_id": current_user["entity_id"]})
        if emp:
            employee_id = emp["_id"]
        else:
            emp = db.employees.find_one({"entity_id": current_user["entity_id"]})
            if emp:
                employee_id = emp["_id"]

    emp = db.employees.find_one(identity_filter(employee_id, "_id", "id", "user_id"))
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    verify_profile_access(emp["_id"], current_user)

    # Department
    dept_name = "Unassigned"
    if emp.get("department_id"):
        dept_doc = db.departments.find_one({"_id": emp["department_id"]})
        if dept_doc:
            dept_name = dept_doc["name"]

    # Manager
    manager_data = None
    if emp.get("manager_id"):
        mgr = db.employees.find_one({"_id": emp["manager_id"]})
        if mgr:
            manager_data = {"id": mgr["_id"], "name": mgr.get("full_name")}

    # Direct reports
    direct_reports = []
    for dr in db.employees.find({"manager_id": employee_id, "status": "ACTIVE"}):
        direct_reports.append({"id": dr["_id"], "name": dr.get("full_name")})

    # Designation from offer or employee
    designation = emp.get("designation", "Employee")

    # Activity
    activity = []
    doj = emp.get("date_of_joining")
    if doj:
        activity.append({"type": "joined", "timestamp": doj.isoformat() if hasattr(doj, "isoformat") else str(doj)})

    return {
        "success": True,
        "data": {
            "basic": {
                "id": emp["_id"],
                "user_id": emp.get("user_id"),
                "name": emp.get("full_name"),
                "first_name": emp.get("first_name", emp.get("full_name")),
                "last_name": emp.get("last_name", ""),
                "nick_name": emp.get("nick_name", ""),
                "email": emp.get("email"),
                "employee_code": emp.get("employee_code"),
                "designation": designation,
                "status": emp.get("status", "Unknown"),
                "phone": emp.get("phone"),
                "address": emp.get("address"),
                "emergency_contact": emp.get("emergency_contact"),
                "pan": emp.get("pan"),
                "aadhaar": emp.get("aadhaar"),
                "uan": emp.get("uan"),
                "bank_account": emp.get("bank_account"),
                "avatar_url": emp.get("avatar_url"),
                "banner_url": emp.get("banner_url"),
            },
            "job": {
                "department": dept_name,
                "department_id": emp.get("department_id"),
                "manager": manager_data["name"] if manager_data else None,
                "date_of_joining": doj.isoformat() if doj and hasattr(doj, "isoformat") else None,
                "source_of_hire": emp.get("source_of_hire", "Direct"),
                "seating_location": emp.get("seating_location", "Noida"),
                "employee_type": emp.get("employee_type", "Permanent"),
                "work_phone": emp.get("work_phone", ""),
                "extension": emp.get("extension", ""),
                "work_role": emp.get("work_role", "Team member"),
            },
            "personal": {
                "other_email": emp.get("other_email", ""),
                "birth_date": emp.get("birth_date", ""),
                "marital_status": emp.get("marital_status", "Single"),
                "bank_name": emp.get("bank_name", ""),
                "account_type": emp.get("account_type", "Savings"),
                "bank_holder_name": emp.get("bank_holder_name", ""),
                "ifsc_code": emp.get("ifsc_code", ""),
                "payment_mode": emp.get("payment_mode", "Bank Transfer"),
            },
            "summary": {
                "job_description": emp.get("job_description", ""),
                "about_me": emp.get("about_me", ""),
                "expertise": emp.get("expertise", ""),
                "gender": emp.get("gender", "Male"),
                "fathers_name": emp.get("fathers_name", ""),
            },
            "reporting": {
                "manager": manager_data,
                "direct_reports": direct_reports,
            },
            "activity": activity,
            "work_experience": emp.get("work_experience", []),
            "education": emp.get("education", []),
            "dependents": emp.get("dependents", []),
        },
        "error": None,
    }


# ── POST /employees/ (create) ────────────────────────────────
@router.post("/", dependencies=[Depends(require_permission(Permissions.EMPLOYEE_CREATE))])
def create_employee_direct(payload: EmployeeCreate, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    entity_id = current_user["entity_id"]

    # 1. Normalize role & email
    role_upper = payload.role.strip().upper()
    email_clean = payload.email.strip().lower()

    # 2. Prevent duplicate email in users or employees (case-insensitive check)
    existing_user = db.users.find_one({"email": {"$regex": f"^{email_clean}$", "$options": "i"}})
    existing_emp = db.employees.find_one({"email": {"$regex": f"^{email_clean}$", "$options": "i"}})
    if existing_user or existing_emp:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    # 3. Generate or validate employee code
    emp_code = payload.employee_code
    if not emp_code:
        count = db.employees.count_documents({"entity_id": entity_id})
        emp_code = f"ZIPA-{datetime.utcnow().year}-{count + 1:04d}"

    # Handle manager relation
    mgr_user_id = None
    if payload.manager_id and payload.manager_id != "none":
        mgr_emp = db.employees.find_one({"_id": payload.manager_id})
        if mgr_emp:
            mgr_user_id = mgr_emp.get("user_id")

    # Date of joining
    doj = datetime.utcnow()
    if payload.date_of_joining:
        try:
            doj = datetime.fromisoformat(payload.date_of_joining)
        except Exception:
            pass

    eid = str(uuid4())
    uid = str(uuid4())

    # 3. Create employee
    db.employees.insert_one({
        "_id": eid, "id": eid,
        "entity_id": entity_id,
        "employee_code": emp_code,
        "full_name": payload.full_name,
        "first_name": payload.first_name or (payload.full_name.split()[0] if payload.full_name else ""),
        "last_name": payload.last_name or (payload.full_name.split()[1] if payload.full_name and len(payload.full_name.split()) > 1 else ""),
        "email": email_clean,
        "department_id": payload.department_id if payload.department_id != "none" else None,
        "status": "ACTIVE",
        "date_of_joining": doj,
        "user_id": uid,
        "documents_uploaded": False,
        "policies_accepted": False,
        "designation": payload.designation or "Staff",
        "manager_id": payload.manager_id if payload.manager_id != "none" else None,
        "manager_user_id": mgr_user_id,
        "avatar_url": payload.avatar_url,
        "seating_location": payload.seating_location or "Noida",
        "work_phone": payload.work_phone,
        "extension": payload.extension,
        "other_email": payload.other_email,
        "birth_date": payload.birth_date,
        "phone": payload.phone,
        "marital_status": payload.marital_status or "Single",
        "about_me": payload.about_me,
        "tags": payload.tags,
        "nick_name": payload.nick_name,
        "expertise": payload.expertise,
        "gender": payload.gender or "Male",
        "application_id": None,
    })

    # 4. Create user account
    import secrets, string
    from app.auth.password import get_password_hash
    temp_password = "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))

    db.users.insert_one({
        "_id": uid, "id": uid, "user_id": uid,
        "email": email_clean,
        "hashed_password": get_password_hash(temp_password),
        "password_hash": get_password_hash(temp_password),
        "role": role_upper,
        "entity_id": entity_id,
        "employee_id": eid,
        "full_name": payload.full_name,
        "name": payload.full_name,
    })

    log_audit(
        user=current_user,
        action=AuditAction.EMPLOYEE_CREATED,
        module="HR",
        resource_type="Employee",
        resource_id=eid,
        new_values={"employee_code": emp_code, "status": "ACTIVE", "role": payload.role.upper()},
    )

    return {
        "success": True,
        "data": {
            "employee_id": eid,
            "employee_code": emp_code,
            "user_id": uid,
            "temp_password": temp_password,
            "message": "Employee and User account created successfully",
        },
    }

@router.delete("/{employee_id}")
async def delete_employee(
    employee_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    role = (current_user.get("role") or "").strip().upper()
    if role not in ("SUPER_ADMIN", "HR_ADMIN"):
        raise HTTPException(
            status_code=403,
            detail="Permission denied: Only HR or SuperAdmin can delete employees."
        )

    emp = db.employees.find_one(identity_filter(employee_id, "_id", "id", "user_id"))
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    validate_entity_match(emp.get("entity_id"), current_user["entity_id"])

    real_employee_id = emp["_id"]
    alt_employee_id = emp.get("id")
    user_id = emp.get("user_id")

    # Delete from employees
    db.employees.delete_one({"_id": real_employee_id})

    # Delete from users (if linked and not the admin themselves)
    admin_uids = {current_user.get("id"), current_user.get("user_id")}
    if user_id and user_id not in admin_uids:
        db.users.delete_one(identity_filter(user_id, "_id", "id", "user_id"))

    # Delete associated records matching any id representation
    emp_ids_to_clean = list({str(x) for x in [real_employee_id, alt_employee_id, employee_id] if x})
    db.attendance.delete_many({"employee_id": {"$in": emp_ids_to_clean}})
    db.biometric_logs.delete_many({"employee_id": {"$in": emp_ids_to_clean}})
    db.leave_balances.delete_many({"employee_id": {"$in": emp_ids_to_clean}})
    db.salary_structures.delete_many({"employee_id": {"$in": emp_ids_to_clean}})
    db.leave_requests.delete_many({"employee_id": {"$in": emp_ids_to_clean}})
    db.it_assets.update_many({"assigned_to": {"$in": emp_ids_to_clean}}, {"$set": {"assigned_to": None, "assigned_to_name": "", "status": "AVAILABLE"}})

    log_audit(
        user=current_user,
        action=AuditAction.EMPLOYEE_DELETED,
        module="HR",
        resource_type="Employee",
        resource_id=str(real_employee_id),
        description=f"Deleted employee {emp.get('full_name')} and associated user account/records."
    )

    return {"success": True, "message": "Employee and all associated records deleted successfully"}
