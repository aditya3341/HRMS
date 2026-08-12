from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
import httpx
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("biomax-simulator")

app = FastAPI(title="BioMax Device Simulator")

# In-memory storage for punches
device_punches = []

# Configurations
HRMS_API_URL = os.getenv("HRMS_API_URL", "http://localhost:8000")
DEVICE_SERIAL = os.getenv("DEVICE_SERIAL", "BX_DEVICE_01")
PUSH_MODE = os.getenv("PUSH_MODE", "true").lower() == "true"

class SimulatePunchRequest(BaseModel):
    employeeId: str
    type: str # IN or OUT
    timestamp: Optional[str] = None
    deviceId: Optional[str] = None

class PunchLog(BaseModel):
    uid: str
    timestamp: str
    type: str

def push_punch_to_hrms(employee_id: str, type_str: str, timestamp_str: str):
    url = f"{HRMS_API_URL}/attendance/punch"
    payload = {
        "employee_code": employee_id,
        "timestamp": timestamp_str,
        "device_id": DEVICE_SERIAL,
        "punch_type": type_str,
        "raw_payload": {
            "source": "BioMax Simulator",
            "simulation_mode": "PUSH"
        }
    }
    try:
        logger.info(f"Pushing punch to HRMS: {url} with payload {payload}")
        # Note: We skip auth in local simulation/internal endpoints
        res = httpx.post(url, json=payload, timeout=5.0)
        logger.info(f"HRMS response status: {res.status_code}, response: {res.text}")
    except Exception as e:
        logger.error(f"Failed to push punch to HRMS: {e}")

@app.post("/simulate/punch")
def simulate_punch(request: SimulatePunchRequest, background_tasks: BackgroundTasks):
    timestamp_str = request.timestamp or datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    device_id = request.deviceId or DEVICE_SERIAL
    
    punch = {
        "uid": request.employeeId,
        "timestamp": timestamp_str,
        "type": request.type
    }
    
    # Store punch locally (for polling mode)
    device_punches.append(punch)
    logger.info(f"Recorded punch locally: {punch}")
    
    # In push mode, call HRMS immediately
    if PUSH_MODE:
        background_tasks.add_task(
            push_punch_to_hrms, 
            request.employeeId, 
            request.type, 
            timestamp_str
        )
        return {
            "success": True, 
            "message": "Punch recorded and push task scheduled", 
            "punch": punch,
            "mode": "PUSH"
        }
        
    return {
        "success": True, 
        "message": "Punch recorded locally (polling mode active)", 
        "punch": punch,
        "mode": "POLL"
    }

@app.get("/api/device/logs", response_model=List[PunchLog])
@app.get("/logs", response_model=List[PunchLog])
def get_device_logs():
    return device_punches

@app.delete("/logs")
def clear_logs():
    device_punches.clear()
    return {"success": True, "message": "Punches cleared"}

@app.get("/")
def index():
    return {
        "status": "online",
        "device_serial": DEVICE_SERIAL,
        "push_mode": PUSH_MODE,
        "hrms_api_target": HRMS_API_URL,
        "logs_count": len(device_punches)
    }
