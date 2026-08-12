"""Biometric Logs API — native MongoDB."""

from datetime import datetime
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, Body, WebSocket, WebSocketDisconnect, Query
from pydantic import BaseModel

from app.core.mongodb import get_mongo_db
from app.auth.constants import Permissions
from app.auth.permission import require_permission
from app.auth.deps import get_current_user, get_current_user_from_token
from app.api.ws_manager import manager

router = APIRouter(prefix="/biometric/logs", tags=["Biometric Logs"])


class PunchRequest(BaseModel):
    employee_code: str
    timestamp: datetime
    device_id: str
    punch_type: str | None = "PUNCH"
    raw_payload: dict | None = None


@router.post("/", dependencies=[Depends(require_permission(Permissions.BIOMETRIC_READ))])
def receive_log(
    biometric_id: str,
    timestamp: datetime,
    punch_type: str | None = None,
    device_code: str | None = None,
    raw_payload: dict | None = Body(None),
):
    db = get_mongo_db()
    device_id = None
    if device_code:
        device = db.biometric_devices.find_one({"device_code": device_code})
        if device:
            device_id = device["_id"]

    lid = str(uuid4())
    db.biometric_logs.insert_one({
        "_id": lid,
        "id": lid,
        "device_id": device_id,
        "employee_code": biometric_id,
        "biometric_id": biometric_id,
        "timestamp": timestamp,
        "punch_type": punch_type,
        "raw_payload": raw_payload,
        "processed": False,
    })

    return {
        "success": True,
        "data": {
            "message": "Biometric log staged successfully",
            "log_id": lid,
            "status": "UNPROCESSED",
        },
        "error": None,
    }


@router.post("/punch", dependencies=[Depends(require_permission(Permissions.BIOMETRIC_READ))])
def receive_punch(
    request: PunchRequest,
):
    db = get_mongo_db()
    device = db.biometric_devices.find_one({"device_code": request.device_id})
    if not device:
        raise HTTPException(status_code=403, detail=f"Unauthorized device: {request.device_id}")

    if device.get("status") != "ACTIVE":
        raise HTTPException(status_code=403, detail="Device is not active.")

    lid = str(uuid4())
    db.biometric_logs.insert_one({
        "_id": lid,
        "id": lid,
        "device_id": device["_id"],
        "employee_code": request.employee_code,
        "biometric_id": request.employee_code,
        "timestamp": request.timestamp,
        "punch_type": request.punch_type,
        "raw_payload": request.raw_payload,
        "processed": False,
    })

    db.biometric_devices.update_one({"_id": device["_id"]}, {"$set": {"last_sync_at": datetime.utcnow()}})

    # Real-time Broadcast
    try:
        mapping = db.biometric_mappings.find_one({"device_enrollment_id": request.employee_code})
        employee = None
        if mapping:
            employee = db.employees.find_one({"_id": mapping["employee_id"]})
        else:
            employee = db.employees.find_one({"employee_code": request.employee_code})

        if employee:
            is_late = request.timestamp.time() > datetime.strptime("09:30:00", "%H:%M:%S").time()
            recent_punches_count = db.biometric_logs.count_documents({
                "employee_code": request.employee_code,
                "timestamp": {"$gte": request.timestamp - timedelta(minutes=5)},
            })
            unusual_behavior = recent_punches_count > 2

            event_data = {
                "id": lid,
                "employee_name": employee.get("full_name"),
                "employee_id": employee["_id"],
                "event": request.punch_type or ("IN" if not is_late else "LATE_IN"),
                "time": request.timestamp.strftime("%I:%M %p"),
                "device": device.get("name"),
                "location": device.get("name"),
                "coords": {"lat": device.get("latitude", 0), "lng": device.get("longitude", 0)},
                "face_image": None,
                "alerts": {
                    "late": is_late,
                    "unusual": unusual_behavior,
                },
            }

            import asyncio
            asyncio.create_task(manager.broadcast_event(
                event_data=event_data,
                target_employee_id=employee["_id"],
                target_manager_id=employee.get("manager_user_id"),
            ))
    except Exception as e:
        print(f"Broadcast error: {e}")

    return {
        "success": True,
        "data": {
            "message": "Punch recorded",
            "log_id": lid,
            "device": device.get("name"),
        },
        "error": None,
    }


@router.get("/", dependencies=[Depends(require_permission(Permissions.BIOMETRIC_READ))])
def list_logs(
    processed: bool | None = None,
    limit: int = 100,
):
    db = get_mongo_db()
    filt = {}
    if processed is not None:
        filt["processed"] = processed

    logs = list(db.biometric_logs.find(filt).sort("timestamp", -1).limit(limit))
    for l in logs:
        l.pop("_id", None)
        if "timestamp" in l and hasattr(l["timestamp"], "isoformat"):
            l["timestamp"] = l["timestamp"].isoformat()
    return {"success": True, "data": logs, "error": None}


@router.websocket("/ws/attendance-live")
async def websocket_attendance(
    websocket: WebSocket,
    token: str = Query(...),
):
    try:
        user = await get_current_user_from_token(token)
        metadata = {
            "role": user.role.name if hasattr(user.role, "name") else user.role,
            "id": user.user_id,
        }

        await manager.connect(websocket, user.user_id, metadata)

        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            manager.disconnect(websocket, user.user_id)

    except Exception:
        await websocket.close(code=1008)


from datetime import timedelta
