"""Employee Self-Service API — native MongoDB."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.mongodb import get_mongo_db
from app.auth.deps import get_current_user

router = APIRouter(prefix="/employee", tags=["Employee Self-Service"])

class ProfileUpdate(BaseModel):
    phone: str | None = None
    address: str | None = None
    emergency_contact: str | None = None
    avatar_url: str | None = None
    banner_url: str | None = None
    
    first_name: str | None = None
    last_name: str | None = None
    nick_name: str | None = None
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

@router.get("/me")
def get_my_profile(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    emp = db.employees.find_one({"user_id": current_user["user_id"], "entity_id": current_user["entity_id"]})
    if not emp:
        raise HTTPException(404, "Employee record not found")
    emp.pop("_id", None)
    if "date_of_joining" in emp and hasattr(emp["date_of_joining"], "isoformat"):
        emp["date_of_joining"] = emp["date_of_joining"].isoformat()
    return {"success": True, "data": emp, "error": None}

@router.patch("/me")
def update_my_profile(payload: ProfileUpdate, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    emp = db.employees.find_one({"user_id": current_user["user_id"], "entity_id": current_user["entity_id"]})
    if not emp:
        raise HTTPException(404, "Employee record not found")
        
    role = (current_user.get("role") or "").strip().upper()
    is_hr_or_super = role in ("SUPER_ADMIN", "HR_ADMIN")
    
    basic_info_fields = {
        "first_name", "last_name", "bank_name", "account_type",
        "bank_holder_name", "ifsc_code", "payment_mode"
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

    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if updates:
        db.employees.update_one({"_id": emp["_id"]}, {"$set": updates})
    return {"success": True, "data": {"message": "Profile updated"}, "error": None}