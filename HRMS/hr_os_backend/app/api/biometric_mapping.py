"""Biometric Mappings API — native MongoDB."""

from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.mongodb import get_mongo_db
from app.auth.constants import Permissions
from app.auth.permission import require_permission
from app.auth.deps import get_current_user

router = APIRouter(prefix="/biometric/mappings", tags=["Biometric Mappings"])


class MappingCreate(BaseModel):
    employee_id: str
    device_enrollment_id: str
    source_device_id: str | None = None


@router.post("/", dependencies=[Depends(require_permission(Permissions.BIOMETRIC_MANAGE))])
def create_mapping(
    mapping_in: MappingCreate,
    current_user=Depends(get_current_user),
):
    db = get_mongo_db()
    existing = db.biometric_mappings.find_one({
        "entity_id": current_user["entity_id"],
        "device_enrollment_id": mapping_in.device_enrollment_id,
    })

    if existing:
        raise HTTPException(status_code=400, detail="Enrollment ID already mapped")

    mid = str(uuid4())
    doc = {
        "_id": mid,
        "id": mid,
        "entity_id": current_user["entity_id"],
        "employee_id": mapping_in.employee_id,
        "device_enrollment_id": mapping_in.device_enrollment_id,
        "source_device_id": mapping_in.source_device_id,
    }
    db.biometric_mappings.insert_one(doc)

    # Set biometric_id on the employee document directly
    db.employees.update_one({"_id": mapping_in.employee_id}, {"$set": {"biometric_id": mapping_in.device_enrollment_id}})

    doc.pop("_id", None)
    return {"success": True, "data": doc, "error": None}


@router.get("/", dependencies=[Depends(require_permission(Permissions.BIOMETRIC_READ))])
def list_mappings(
    current_user=Depends(get_current_user),
):
    db = get_mongo_db()
    mappings = list(db.biometric_mappings.find({"entity_id": current_user["entity_id"]}))

    result = []
    for m in mappings:
        emp = db.employees.find_one({"_id": m.get("employee_id")})
        dev = db.biometric_devices.find_one({"_id": m.get("source_device_id")}) if m.get("source_device_id") else None

        result.append({
            "id": m["_id"],
            "employee_id": m.get("employee_id"),
            "employee_name": emp.get("full_name") if emp else "Unknown",
            "employee_code": emp.get("employee_code") if emp else "N/A",
            "device_enrollment_id": m.get("device_enrollment_id"),
            "source_device_name": dev.get("name") if dev else "Global",
        })

    return {"success": True, "data": result, "error": None}


@router.delete("/{mapping_id}", dependencies=[Depends(require_permission(Permissions.BIOMETRIC_MANAGE))])
def delete_mapping(
    mapping_id: str,
):
    db = get_mongo_db()
    mapping = db.biometric_mappings.find_one({"_id": mapping_id})
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")

    db.biometric_mappings.delete_one({"_id": mapping_id})
    # Remove biometric_id from employee
    db.employees.update_one({"_id": mapping.get("employee_id")}, {"$unset": {"biometric_id": ""}})

    return {"success": True, "message": "Mapping deleted"}