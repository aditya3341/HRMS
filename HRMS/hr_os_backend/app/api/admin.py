"""Admin API — native MongoDB."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime
from uuid import uuid4

from app.core.mongodb import get_mongo_db
from app.auth.deps import get_current_user
from app.auth.constants import Permissions
from app.auth.permission import require_permission
from app.auth.password import get_password_hash
from app.utils.audit import log_audit

router = APIRouter(prefix="/admin", tags=["Admin"])

class UserCreate(BaseModel):
    email: str
    password: str
    role: str
class UserUpdate(BaseModel):
    role: str | None = None
    password: str | None = None
class DepartmentCreate(BaseModel):
    name: str
class RolePermissionUpdate(BaseModel):
    role: str
    permissions: list[str]

class RoleCreate(BaseModel):
    role: str
    display_name: str
    description: str | None = None

class UserPermissionsUpdate(BaseModel):
    permissions: list[str]

class UserRoleUpdate(BaseModel):
    role: str

class UserDepartmentUpdate(BaseModel):
    department_id: str | None = None

# ── Users ─────────────────────────────────────────────────────
@router.get("/users", dependencies=[Depends(require_permission(Permissions.ADMIN))])
def list_users(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    users = list(db.users.find({"entity_id": current_user["entity_id"]}))
    result = []
    for u in users:
        emp = db.employees.find_one({"user_id": u["_id"]})
        result.append({
            "id": u["_id"], "email": u.get("email"), "role": u.get("role"),
            "employee_id": u.get("employee_id"),
            "full_name": emp.get("full_name") if emp else None,
        })
    return {"success": True, "data": result, "error": None}

@router.get("/users/search")
def search_users(q: str = "", current_user=Depends(get_current_user)):
    db = get_mongo_db()
    users = list(db.users.find({"entity_id": current_user["entity_id"]}))
    result = []
    q_lower = q.lower()
    for u in users:
        emp = db.employees.find_one({"user_id": u["_id"]})
        full_name = emp.get("full_name") if emp else ""
        email = u.get("email", "")
        
        if q_lower and q_lower not in email.lower() and q_lower not in full_name.lower():
            continue
            
        result.append({
            "id": u["_id"], "email": email, "role": u.get("role"),
            "employee_id": u.get("employee_id"),
            "full_name": full_name if full_name else None,
        })
    return {"success": True, "data": result, "error": None}

@router.post("/users", dependencies=[Depends(require_permission(Permissions.ADMIN))])
def create_user(payload: UserCreate, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    if db.users.find_one({"email": payload.email}):
        raise HTTPException(400, "Email already exists")
    uid = str(uuid4())
    db.users.insert_one({
        "_id": uid, "id": uid, "email": payload.email,
        "hashed_password": get_password_hash(payload.password),
        "password_hash": get_password_hash(payload.password),
        "role": payload.role.upper(), "entity_id": current_user["entity_id"],
    })
    return {"success": True, "data": {"id": uid, "email": payload.email, "role": payload.role.upper()}, "error": None}

@router.patch("/users/{user_id}", dependencies=[Depends(require_permission(Permissions.ADMIN))])
def update_user(user_id: str, payload: UserUpdate, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    updates = {}
    if payload.role:
        updates["role"] = payload.role.upper()
    if payload.password:
        h = get_password_hash(payload.password)
        updates["hashed_password"] = h
        updates["password_hash"] = h
    if updates:
        db.users.update_one({"_id": user_id}, {"$set": updates})
    return {"success": True, "data": {"message": "User updated"}, "error": None}

@router.delete("/users/{user_id}", dependencies=[Depends(require_permission(Permissions.ADMIN))])
def delete_user(user_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    db.users.delete_one({"_id": user_id})
    return {"success": True, "data": {"message": "User deleted"}, "error": None}

# ── Departments ───────────────────────────────────────────────
@router.get("/departments")
def list_departments(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    depts = list(db.departments.find({"entity_id": current_user["entity_id"]}).sort("name", 1))
    result = []
    for d in depts:
        count = db.employees.count_documents({"department_id": d["_id"], "status": "ACTIVE"})
        result.append({"id": d["_id"], "name": d.get("name"), "employee_count": count})
    return {"success": True, "data": result, "error": None}

@router.post("/departments", dependencies=[Depends(require_permission(Permissions.ADMIN))])
def create_department(payload: DepartmentCreate, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    did = str(uuid4())
    db.departments.insert_one({
        "_id": did, "id": did, "name": payload.name,
        "entity_id": current_user["entity_id"], "created_at": datetime.utcnow(),
    })
    log_audit(user=current_user, action="DEPARTMENT_CREATED", module="Admin",
              resource_type="Department", resource_id=did, new_values={"name": payload.name})
    return {"success": True, "data": {"id": did, "name": payload.name}, "error": None}

@router.delete("/departments/{dept_id}", dependencies=[Depends(require_permission(Permissions.ADMIN))])
def delete_department(dept_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    count = db.employees.count_documents({"department_id": dept_id, "status": "ACTIVE"})
    if count > 0:
        raise HTTPException(400, f"Cannot delete — {count} active employees in this department")
    db.departments.delete_one({"_id": dept_id})
    return {"success": True, "data": {"message": "Department deleted"}, "error": None}

# ── Roles & Permissions ───────────────────────────────────────
@router.get("/roles")
def list_roles(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    roles = list(db.role_permissions.find({"entity_id": current_user["entity_id"]}))
    result = []
    
    # Pre-defined system role details
    default_metadata = {
        "SUPER_ADMIN": {"display_name": "Super Admin", "description": "Full system access and configurations control."},
        "HR_ADMIN": {"display_name": "HR Admin", "description": "Manage employees, payroll, recruiting, and core settings."},
        "HR": {"display_name": "HR Executive", "description": "Execute hiring, applications, onboarding, and employee records."},
        "MANAGER": {"display_name": "Manager", "description": "Manage team attendance, leaves, and performance reviews."},
        "EMPLOYEE": {"display_name": "Employee", "description": "Self-service portal for attendance, leaves, and goals."},
    }

    for r in roles:
        rname = r.get("role")
        meta = db.role_metadata.find_one({"role_name": rname})
        
        display_name = meta.get("display_name") if meta else default_metadata.get(rname, {}).get("display_name")
        description = meta.get("description") if meta else default_metadata.get(rname, {}).get("description")
        
        if not display_name:
            display_name = rname.replace("_", " ").title()
        if not description:
            description = f"Custom defined system role for {display_name}."

        result.append({
            "role": rname, 
            "display_name": display_name, 
            "description": description, 
            "permissions": r.get("permissions", [])
        })
    return {"success": True, "data": result, "error": None}

@router.post("/roles", dependencies=[Depends(require_permission(Permissions.ADMIN))])
def create_role(payload: RoleCreate, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    role_upper = payload.role.upper().replace(" ", "_")
    entity_id = current_user["entity_id"]
    
    existing = db.role_permissions.find_one({"role": role_upper, "entity_id": entity_id})
    if existing:
        raise HTTPException(400, "Role already exists")
        
    rpid = str(uuid4())
    db.role_permissions.insert_one({
        "_id": rpid, "id": rpid, "role": role_upper,
        "permissions": [], "entity_id": entity_id,
    })
    
    db.role_metadata.update_one(
        {"role_name": role_upper},
        {"$set": {
            "role_name": role_upper,
            "display_name": payload.display_name,
            "description": payload.description or f"Custom defined system role for {payload.display_name}."
        }},
        upsert=True
    )
    
    return {"success": True, "data": {"role": role_upper, "display_name": payload.display_name}, "error": None}

@router.delete("/roles/{role}", dependencies=[Depends(require_permission(Permissions.ADMIN))])
def delete_role(role: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    entity_id = current_user["entity_id"]
    role_upper = role.upper()
    
    SYSTEM_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "EMPLOYEE", "HR_ADMIN", "HR"]
    if role_upper in SYSTEM_ROLES:
        raise HTTPException(400, "Cannot delete system protected roles.")
        
    count = db.users.count_documents({"role": role_upper, "entity_id": entity_id})
    if count > 0:
        raise HTTPException(400, f"Cannot delete role — it is assigned to {count} user(s).")
        
    db.role_permissions.delete_many({"role": role_upper, "entity_id": entity_id})
    db.role_metadata.delete_many({"role_name": role_upper})
    
    return {"success": True, "data": {"message": f"Role {role_upper} deleted successfully"}, "error": None}

@router.get("/roles/{role}/permissions")
def get_role_permissions(role: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    entity_id = current_user["entity_id"]
    role_upper = role.upper()
    
    doc = db.role_permissions.find_one({"role": role_upper, "entity_id": entity_id})
    perms = doc.get("permissions", []) if doc else []
    return {"success": True, "data": perms, "error": None}

@router.patch("/roles/{role}/permissions", dependencies=[Depends(require_permission(Permissions.ADMIN))])
def patch_role_permissions(role: str, payload: UserPermissionsUpdate, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    entity_id = current_user["entity_id"]
    role_upper = role.upper()
    
    existing = db.role_permissions.find_one({"role": role_upper, "entity_id": entity_id})
    if existing:
        db.role_permissions.update_one({"_id": existing["_id"]}, {"$set": {"permissions": payload.permissions}})
    else:
        rpid = str(uuid4())
        db.role_permissions.insert_one({
            "_id": rpid, "id": rpid, "role": role_upper,
            "permissions": payload.permissions, "entity_id": entity_id,
        })
    return {"success": True, "data": {"message": f"Permissions for {role_upper} updated"}, "error": None}

@router.get("/permissions")
def list_permissions(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    perms = list(db.permissions.find())
    
    def get_permission_category(code: str) -> str:
        parts = code.split(".")
        prefix = parts[0] if len(parts) > 1 else code
        mapping = {
            "dashboard": "Dashboard",
            "job": "Jobs",
            "jobs": "Jobs",
            "application": "Applications",
            "applications": "Applications",
            "offer": "Offers",
            "offers": "Offers",
            "onboarding": "Onboarding",
            "attendance": "Attendance",
            "payroll": "Payroll",
            "asset": "IT Assets",
            "it_assets": "IT Assets",
            "ticket": "ZipaDesk",
            "it_tickets": "ZipaDesk",
            "biometric": "Biometric Devices",
            "leave": "Leaves",
            "notification": "Notifications",
            "employee": "Employee Self-Service",
            "performance": "Performance",
            "appraisal": "Performance",
            "promotion": "Performance",
            "entity": "Entities",
            "admin": "Admin Settings",
            "resume": "Resume Tools"
        }
        return mapping.get(prefix.lower(), prefix.title())

    grouped = {}
    for p in perms:
        code = p.get("code")
        if not code:
            continue
        cat = get_permission_category(code)
        if cat not in grouped:
            grouped[cat] = []
        grouped[cat].append({
            "id": p.get("id") or str(p.get("_id")),
            "code": code,
            "description": p.get("description") or f"Permission for {code}"
        })
    return {"success": True, "data": grouped, "error": None}

# ── User-Specific Permissions & Role Updates ──────────────────
@router.get("/users/{user_id}/permissions", dependencies=[Depends(require_permission(Permissions.ADMIN))])
def get_user_permissions(user_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    entity_id = current_user["entity_id"]
    
    user_doc = db.user_permissions.find_one({"user_id": user_id, "entity_id": entity_id})
    perms = user_doc.get("permissions", []) if user_doc else []
    return {"success": True, "data": perms, "error": None}

@router.patch("/users/{user_id}/permissions", dependencies=[Depends(require_permission(Permissions.ADMIN))])
def patch_user_permissions(user_id: str, payload: UserPermissionsUpdate, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    entity_id = current_user["entity_id"]
    
    existing = db.user_permissions.find_one({"user_id": user_id, "entity_id": entity_id})
    if existing:
        db.user_permissions.update_one({"_id": existing["_id"]}, {"$set": {"permissions": payload.permissions}})
    else:
        upid = str(uuid4())
        db.user_permissions.insert_one({
            "_id": upid, "id": upid, "user_id": user_id,
            "permissions": payload.permissions, "entity_id": entity_id,
        })
    return {"success": True, "data": {"message": "User permissions updated successfully"}, "error": None}

@router.patch("/users/{user_id}/role")
def patch_user_role(user_id: str, payload: UserRoleUpdate, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    entity_id = current_user["entity_id"]
    
    role = (current_user.get("role") or "EMPLOYEE").upper()
    if role not in ("SUPER_ADMIN", "ADMIN", "HR_ADMIN", "HR"):
        raise HTTPException(status_code=403, detail="Only Super Admins, Admins, and HR can change roles")
        
    user_doc = db.users.find_one({"_id": user_id, "entity_id": entity_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
        
    db.users.update_one({"_id": user_id}, {"$set": {"role": payload.role.upper()}})
    db.employees.update_one({"user_id": user_id}, {"$set": {"role": payload.role.upper()}})
    
    return {"success": True, "data": {"message": "User role updated successfully"}, "error": None}

@router.patch("/users/{user_id}/department")
def patch_user_department(user_id: str, payload: UserDepartmentUpdate, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    
    role = (current_user.get("role") or "EMPLOYEE").upper()
    if role not in ("SUPER_ADMIN", "ADMIN", "HR_ADMIN", "HR"):
        raise HTTPException(status_code=403, detail="Only Super Admins, Admins, and HR can reassign departments")
        
    # Find employee
    emp = db.employees.find_one({"user_id": user_id})
    if not emp:
        raise HTTPException(status_code=404, detail="No mapped employee record found for this user")
        
    db.employees.update_one({"_id": emp["_id"]}, {"$set": {"department_id": payload.department_id}})
    
    return {"success": True, "data": {"message": "User department updated successfully"}, "error": None}

# ── Entity Info ───────────────────────────────────────────────
@router.get("/entity")
def get_entity(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    entity = db.entities.find_one({"_id": current_user["entity_id"]})
    if not entity:
        return {"success": True, "data": {"id": current_user["entity_id"], "name": "Unknown"}, "error": None}
    entity.pop("_id", None)
    return {"success": True, "data": entity, "error": None}
