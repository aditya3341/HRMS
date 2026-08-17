"""System Configuration API — native MongoDB."""

from datetime import datetime
from uuid import uuid4
from typing import Dict, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.mongodb import get_mongo_db
from app.auth.deps import get_current_user
from app.auth.constants import Permissions
from app.auth.permission import require_permission
from app.utils.audit import log_audit

router = APIRouter(prefix="/configs", tags=["System Config"])


def require_super_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Only SUPER_ADMIN can modify system configurations.")
    return current_user


# ─── Config Schema Validators ────────────────────────────────────────────────

CONFIG_SCHEMAS: Dict[str, Dict] = {
    "LEAVE_CONFIG": {
        "required": ["leave_types", "max_per_year", "approval_required"],
        "defaults": {
            "leave_types": ["SICK", "CASUAL", "EARNED"],
            "max_per_year": {"SICK": 10, "CASUAL": 12, "EARNED": 15},
            "carry_forward": True,
            "approval_required": True,
            "max_consecutive_days": 5,
        },
    },
    "ATTENDANCE_CONFIG": {
        "required": ["work_hours_per_day", "grace_period_minutes"],
        "defaults": {
            "work_hours_per_day": 8,
            "grace_period_minutes": 15,
            "half_day_threshold": 4,
            "late_mark_rule": True,
        },
    },
    "HOLIDAY_CONFIG": {
        "required": ["holidays"],
        "defaults": {
            "holidays": [],
            "region_holidays": {},
        },
    },
    "PAYROLL_CONFIG": {
        "required": ["lop_calculation"],
        "defaults": {
            "lop_calculation": "PER_DAY",
            "bonus_enabled": True,
            "tax_deduction_enabled": True,
            "allow_post_lock_adjustment": False,
        },
    },
    "NOTIFICATION_CONFIG": {
        "required": [],
        "defaults": {
            "email_enabled": True,
            "reminder_days_before_review": 3,
        },
    },
    "ATTENDANCE_SECURITY_CONFIG": {
        "required": [],
        "defaults": {
            "geo_fencing_enabled": False,
            "selfie_required": False,
            "allowed_radius_meters": 200,
            "allowed_locations": [],
            "enforced_roles": [],
            "enforced_employee_ids": [],
            "allow_manual_override": True,
        },
    },
    "ATTENDANCE_REGULARIZATION_CONFIG": {
        "required": [],
        "defaults": {
            "reasons": ["Missed Punch", "System Error", "Work From Home", "Client Visit", "Other"],
            "require_comment_if_other": True,
        },
    },
    "ATTENDANCE_MODE_CONFIG": {
        "required": [],
        "defaults": {
            "mode": "BIOMETRIC",
            "allow_manual": False,
            "auto_calculate_hours": True,
            "first_in_last_out": True,
        },
    },
    "ATTENDANCE_AI_CONFIG": {
        "required": [],
        "defaults": {
            "behavior_tracking_enabled": True,
            "trust_score_enabled": True,
            "fraud_detection_enabled": True,
            "location_modes_enabled": True,
            "device_tracking_enabled": True,
            "performance_impact_enabled": True,
            "late_penalty_weight": 0.2,
            "attendance_weight_in_rating": 0.15,
        },
    },
    "PAYROLL_ATTENDANCE_RULES": {
        "required": [],
        "defaults": {
            "late_penalty_enabled": True,
            "absent_deduction_enabled": True,
            "consistency_bonus_enabled": True,
        },
    },
    "AI_CONFIG": {
        "required": [],
        "defaults": {
            "enabled": True,
            "provider": "GEMINI",
            "gemini_api_key": "",
            "api_key": "",
            "model_name": "gemini-2.5-flash",
            "temperature": 0.7,
            "confidence_threshold": 0.5,
            "features": {
                "summary": True,
                "rating_suggestion": True,
                "risk_detection": True,
                "resume_parsing": True,
            },
        },
    },
    "GOAL_SETTINGS_CONFIG": {
        "required": [],
        "defaults": {
            "max_goals": 10,
            "min_goals": 3,
            "weightage_total": 100,
            "weightage_tolerance": 0,
        },
    },
    "PROFILE_CONFIG": {
        "required": [],
        "defaults": {
            "allow_self_profile_view": True,
            "allowed_employee_ids": [],
            "allowed_roles": ["SUPER_ADMIN", "HR_ADMIN", "HR", "ADMIN", "MANAGER", "EMPLOYEE"],
        },
    },
}



def validate_config(key: str, value: dict) -> Optional[str]:
    """Returns error string if invalid, None if valid."""
    schema = CONFIG_SCHEMAS.get(key)
    if not schema:
        return None

    missing = [field for field in schema["required"] if field not in value]
    if missing:
        return f"Missing required fields: {', '.join(missing)}"
    return None


class SystemConfigUpdate(BaseModel):
    config_value: dict
    description: str | None = None


# ─── CRUD Endpoints ───────────────────────────────────────────────────────────

@router.get("/")
@router.get("")
@router.get("/all")
def get_all_configs(
    current_user: dict = Depends(get_current_user),
    _=Depends(require_permission(Permissions.ENTITY_MANAGE)),
):
    db = get_mongo_db()
    entity_id = current_user["entity_id"]

    # 1. Fetch existing configs
    existing_docs = list(db.system_configs.find({"entity_id": entity_id}))
    existing_by_key = {}
    for doc in existing_docs:
        k = doc.get("config_key") or doc.get("key")
        if k:
            existing_by_key[k] = doc

    # 2. Build response configs list
    configs = []

    # Display all standard config schemas
    for key, schema in CONFIG_SCHEMAS.items():
        doc = existing_by_key.get(key)
        if doc:
            val = doc.get("config_value") or doc.get("value")
            if not isinstance(val, dict):
                val = {"value": val}
            configs.append({
                "id": doc.get("id", str(doc["_id"])),
                "config_key": key,
                "config_value": val,
                "description": doc.get("description") or f"Manage {key.replace('_', ' ').lower()}",
                "is_active": doc.get("is_active", True),
                "updated_at": doc["updated_at"].isoformat() if "updated_at" in doc and hasattr(doc["updated_at"], "isoformat") else datetime.utcnow().isoformat()
            })
        else:
            configs.append({
                "id": f"default-{key}",
                "config_key": key,
                "config_value": schema["defaults"],
                "description": f"Manage {key.replace('_', ' ').lower()}",
                "is_active": True,
                "updated_at": datetime.utcnow().isoformat()
            })

    # Add other database configs that aren't in CONFIG_SCHEMAS
    for key, doc in existing_by_key.items():
        if key not in CONFIG_SCHEMAS:
            val = doc.get("config_value") or doc.get("value")
            if not isinstance(val, dict):
                val = {"value": val}
            configs.append({
                "id": doc.get("id", str(doc["_id"])),
                "config_key": key,
                "config_value": val,
                "description": doc.get("description") or f"Manage {key.replace('_', ' ').lower()}",
                "is_active": doc.get("is_active", True),
                "updated_at": doc["updated_at"].isoformat() if "updated_at" in doc and hasattr(doc["updated_at"], "isoformat") else datetime.utcnow().isoformat()
            })

    return {"success": True, "data": configs, "error": None}



@router.get("/{key}")
def get_config_by_key(
    key: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_mongo_db()
    entity_id = current_user["entity_id"]
    config = db.system_configs.find_one({"config_key": key, "entity_id": entity_id})

    if not config:
        schema = CONFIG_SCHEMAS.get(key)
        if schema:
            return {
                "success": True,
                "data": {
                    "id": f"default-{key}",
                    "config_key": key,
                    "config_value": schema["defaults"],
                    "description": f"Default {key} configuration",
                    "is_active": True,
                    "updated_at": datetime.utcnow().isoformat(),
                },
                "error": None,
            }
        raise HTTPException(status_code=404, detail="Config not found")

    config.pop("_id", None)
    if "updated_at" in config and hasattr(config["updated_at"], "isoformat"):
        config["updated_at"] = config["updated_at"].isoformat()

    return {"success": True, "data": config, "error": None}


@router.put("/{key}")
def update_config(
    key: str,
    payload: SystemConfigUpdate,
    current_user: dict = Depends(require_super_admin),
):
    error = validate_config(key, payload.config_value)
    if error:
        raise HTTPException(status_code=422, detail=f"Config validation failed: {error}")

    db = get_mongo_db()
    entity_id = current_user["entity_id"]

    config = db.system_configs.find_one({"config_key": key, "entity_id": entity_id})
    old_value = config.get("config_value") if config else None

    updates = {
        "config_value": payload.config_value,
        "description": payload.description or f"Updated {key}",
        "updated_by": current_user["user_id"],
        "updated_at": datetime.utcnow(),
        "is_active": True,
    }

    if config:
        db.system_configs.update_one({"_id": config["_id"]}, {"$set": updates})
        cid = config["_id"]
    else:
        cid = str(uuid4())
        db.system_configs.insert_one({
            "_id": cid,
            "id": cid,
            "config_key": key,
            "entity_id": entity_id,
            **updates,
        })

    # Log to config audit log
    db.config_audit_logs.insert_one({
        "_id": str(uuid4()),
        "config_key": key,
        "entity_id": entity_id,
        "old_value": old_value,
        "new_value": payload.config_value,
        "updated_by": current_user["user_id"],
        "timestamp": datetime.utcnow(),
    })

    log_audit(
        user=current_user,
        action="CONFIG_UPDATED",
        module="SYSTEM",
        resource_type="SystemConfig",
        resource_id=key,
        old_values=old_value,
        new_values=payload.config_value,
    )

    return {"success": True, "message": f"Config '{key}' updated successfully."}


@router.get("/{key}/history")
def get_config_history(
    key: str,
    current_user: dict = Depends(require_super_admin),
):
    db = get_mongo_db()
    entity_id = current_user["entity_id"]
    logs = list(db.config_audit_logs.find({"config_key": key, "entity_id": entity_id}).sort("timestamp", -1).limit(50))

    data = []
    for l in logs:
        data.append({
            "id": l.get("id", str(l["_id"])),
            "old_value": l.get("old_value"),
            "new_value": l.get("new_value"),
            "updated_by": l.get("updated_by"),
            "timestamp": l["timestamp"].isoformat() if hasattr(l["timestamp"], "isoformat") else str(l["timestamp"]),
        })

    return {"success": True, "data": data, "error": None}


# ─── Payroll Lock Endpoints ───────────────────────────────────────────────────

class PayrollLockRequest(BaseModel):
    cycle_id: str
    is_locked: bool


@router.post("/payroll-lock")
def set_payroll_lock(
    payload: PayrollLockRequest,
    current_user: dict = Depends(require_super_admin),
):
    db = get_mongo_db()
    entity_id = current_user["entity_id"]
    lock = db.payroll_locks.find_one({"cycle_id": payload.cycle_id, "entity_id": entity_id})

    updates = {
        "is_locked": payload.is_locked,
        "locked_at": datetime.utcnow() if payload.is_locked else None,
        "locked_by": current_user["user_id"],
    }

    if lock:
        db.payroll_locks.update_one({"_id": lock["_id"]}, {"$set": updates})
    else:
        db.payroll_locks.insert_one({
            "_id": str(uuid4()),
            "entity_id": entity_id,
            "cycle_id": payload.cycle_id,
            **updates,
        })

    status = "LOCKED" if payload.is_locked else "UNLOCKED"
    return {"success": True, "message": f"Payroll cycle '{payload.cycle_id}' is now {status}."}


@router.get("/payroll-lock")
@router.get("/payroll-lock/")
def get_payroll_lock_status_empty(
    current_user: dict = Depends(get_current_user),
):
    return {"success": True, "data": {"cycle_id": "", "is_locked": False}, "error": None}


@router.get("/payroll-lock/{cycle_id}")
def get_payroll_lock_status(
    cycle_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_mongo_db()
    entity_id = current_user["entity_id"]
    lock = db.payroll_locks.find_one({"cycle_id": cycle_id, "entity_id": entity_id})

    if not lock:
        return {"success": True, "data": {"cycle_id": cycle_id, "is_locked": False}, "error": None}

    return {
        "success": True,
        "data": {
            "cycle_id": cycle_id,
            "is_locked": lock.get("is_locked", False),
            "locked_at": lock["locked_at"].isoformat() if lock.get("locked_at") and hasattr(lock["locked_at"], "isoformat") else None,
        },
        "error": None,
    }
