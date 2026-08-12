"""Biometric Devices API — native MongoDB."""

from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel

from app.core.mongodb import get_mongo_db
from app.auth.constants import Permissions
from app.auth.permission import require_permission
from app.auth.deps import get_current_user

router = APIRouter(prefix="/biometric/devices", tags=["Biometric Devices"])


class DeviceCreate(BaseModel):
    name: str
    device_type: str
    connection_type: str
    device_code: str
    ip_address: str | None = None
    port: int | None = None
    api_url: str | None = None


class DeviceUpdate(BaseModel):
    name: str | None = None
    status: str | None = None
    ip_address: str | None = None
    port: int | None = None
    api_url: str | None = None
    device_code: str | None = None
    connection_type: str | None = None


@router.post("/", dependencies=[Depends(require_permission(Permissions.BIOMETRIC_MANAGE))])
def register_device(
    device_in: DeviceCreate,
    current_user=Depends(get_current_user),
):
    db = get_mongo_db()
    existing = db.biometric_devices.find_one({"device_code": device_in.device_code})
    if existing:
        raise HTTPException(status_code=400, detail="Device code already exists")

    did = str(uuid4())
    doc = {
        "_id": did,
        "id": did,
        "entity_id": current_user["entity_id"],
        "name": device_in.name,
        "device_type": device_in.device_type,
        "connection_type": device_in.connection_type,
        "device_code": device_in.device_code,
        "ip_address": device_in.ip_address,
        "port": device_in.port,
        "api_url": device_in.api_url,
        "status": "ACTIVE",
        "registered_by": current_user["email"],
    }
    db.biometric_devices.insert_one(doc)
    doc.pop("_id", None)
    return {"success": True, "data": doc, "error": None}


@router.get("/", dependencies=[Depends(require_permission(Permissions.BIOMETRIC_READ))])
def list_devices(
    current_user=Depends(get_current_user),
):
    db = get_mongo_db()
    devices = list(db.biometric_devices.find({"entity_id": current_user["entity_id"]}))
    for d in devices:
        d.pop("_id", None)
    return {"success": True, "data": devices, "error": None}


@router.patch("/{device_id}", dependencies=[Depends(require_permission(Permissions.BIOMETRIC_MANAGE))])
def update_device(
    device_id: str,
    device_update: DeviceUpdate,
):
    db = get_mongo_db()
    device = db.biometric_devices.find_one({"_id": device_id})
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    updates = {k: v for k, v in device_update.model_dump(exclude_unset=True).items() if v is not None}
    if updates:
        db.biometric_devices.update_one({"_id": device_id}, {"$set": updates})

    updated = db.biometric_devices.find_one({"_id": device_id})
    if updated:
        updated.pop("_id", None)
    return {"success": True, "data": updated, "error": None}


class BiomaxSyncConfig(BaseModel):
    api_url: str
    api_key: str
    device_serial: str
    enabled: bool


@router.get("/biomax/config")
def get_biomax_config(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    cfg = db.system_configs.find_one({"key": "BIOMAX_INTEGRATION_CONFIG"})
    val = cfg.get("value") if cfg else {
        "api_url": "http://192.168.1.200/api",
        "api_key": "",
        "device_serial": "BX_DEVICE_01",
        "enabled": False
    }
    return {"success": True, "data": val, "error": None}


@router.post("/biomax/config")
def save_biomax_config(payload: BiomaxSyncConfig, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    db.system_configs.update_one(
        {"key": "BIOMAX_INTEGRATION_CONFIG"},
        {"$set": {
            "key": "BIOMAX_INTEGRATION_CONFIG",
            "value": payload.model_dump()
        }},
        upsert=True
    )
    return {"success": True, "data": payload.model_dump(), "error": None}


@router.post("/biomax/sync")
def sync_biomax_data(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    cfg = db.system_configs.find_one({"key": "BIOMAX_INTEGRATION_CONFIG"})
    if not cfg or not cfg.get("value", {}).get("enabled"):
        return {"success": False, "data": None, "error": "Biomax integration is not enabled or configured."}
    
    api_url = cfg["value"].get("api_url")
    device_serial = cfg["value"].get("device_serial")
    
    return {
        "success": True, 
        "data": {
            "message": "Simulated Biomax pull sync completed successfully",
            "api_targeted": f"{api_url}/api/v1/punches",
            "device_serial": device_serial,
            "logs_pulled_count": 0,
            "status": "COMPLETED"
        },
        "error": None
    }


@router.post("/biomax/webhook")
def receive_biomax_webhook(payload: dict = Body(...)):
    from datetime import datetime
    db = get_mongo_db()
    
    user_id = payload.get("UserID")
    log_time_str = payload.get("LogTime")
    device_serial = payload.get("DeviceSerial")
    punch_type = payload.get("PunchType", "PUNCH")
    
    if not user_id or not log_time_str:
        raise HTTPException(status_code=400, detail="Missing UserID or LogTime in payload")
        
    try:
        timestamp = datetime.strptime(log_time_str, "%Y-%m-%d %H:%M:%S")
    except ValueError:
        timestamp = datetime.utcnow()
        
    device_id = None
    if device_serial:
        device = db.biometric_devices.find_one({"device_code": device_serial})
        if device:
            device_id = device["_id"]
            
    lid = str(uuid4())
    db.biometric_logs.insert_one({
        "_id": lid,
        "id": lid,
        "device_id": device_id,
        "employee_code": user_id,
        "biometric_id": user_id,
        "timestamp": timestamp,
        "punch_type": punch_type,
        "raw_payload": payload,
        "processed": False,
        "source": "BIOMAX_PUSH"
    })
    
    return {"success": True, "message": "Biomax webhook log staged successfully", "log_id": lid}