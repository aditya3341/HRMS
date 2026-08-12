"""Jobs API — native MongoDB."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime
from uuid import uuid4

from app.core.mongodb import get_mongo_db
from app.auth.deps import get_current_user
from app.auth.constants import Permissions
from app.auth.permission import require_permission

router = APIRouter(prefix="/jobs", tags=["Jobs"])


class JobCreate(BaseModel):
    title: str
    department: str = ""
    description: str = ""
    requirements: str = ""
    location: str = ""
    openings: int = 1

class JobUpdate(BaseModel):
    title: str | None = None
    department: str | None = None
    description: str | None = None
    requirements: str | None = None
    location: str | None = None
    status: str | None = None
    openings: int | None = None


@router.get("/", dependencies=[Depends(require_permission(Permissions.JOB_READ))])
def list_jobs(current_user=Depends(get_current_user), status: str | None = None):
    db = get_mongo_db()
    filt: dict = {"entity_id": current_user["entity_id"]}
    if status:
        filt["status"] = status.upper()
    jobs = list(db.jobs.find(filt).sort("created_at", -1))
    for j in jobs:
        j.pop("_id", None)
        if "created_at" in j and hasattr(j["created_at"], "isoformat"):
            j["created_at"] = j["created_at"].isoformat()
    return {"success": True, "data": jobs, "error": None}


@router.get("/{job_id}", dependencies=[Depends(require_permission(Permissions.JOB_READ))])
def get_job(job_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    job = db.jobs.find_one({"_id": job_id, "entity_id": current_user["entity_id"]})
    if not job:
        raise HTTPException(404, "Job not found")
    job.pop("_id", None)
    if "created_at" in job and hasattr(job["created_at"], "isoformat"):
        job["created_at"] = job["created_at"].isoformat()
    return {"success": True, "data": job, "error": None}


@router.post("/", dependencies=[Depends(require_permission(Permissions.JOB_CREATE))])
def create_job(payload: JobCreate, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    jid = str(uuid4())
    doc = {
        "_id": jid, "id": jid,
        "entity_id": current_user["entity_id"],
        "title": payload.title,
        "department": payload.department,
        "description": payload.description,
        "requirements": payload.requirements,
        "location": payload.location,
        "status": "OPEN",
        "openings": payload.openings,
        "created_at": datetime.utcnow(),
        "created_by": current_user["user_id"],
    }
    db.jobs.insert_one(doc)
    doc.pop("_id", None)
    doc["created_at"] = doc["created_at"].isoformat()
    return {"success": True, "data": doc, "error": None}


@router.patch("/{job_id}", dependencies=[Depends(require_permission(Permissions.JOB_CREATE))])
def update_job(job_id: str, payload: JobUpdate, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    job = db.jobs.find_one({"_id": job_id, "entity_id": current_user["entity_id"]})
    if not job:
        raise HTTPException(404, "Job not found")

    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if "status" in updates:
        updates["status"] = updates["status"].upper()
    if updates:
        db.jobs.update_one({"_id": job_id}, {"$set": updates})

    return {"success": True, "data": {"message": "Job updated"}, "error": None}


@router.delete("/{job_id}", dependencies=[Depends(require_permission(Permissions.JOB_CREATE))])
def delete_job(job_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    result = db.jobs.delete_one({"_id": job_id, "entity_id": current_user["entity_id"]})
    if result.deleted_count == 0:
        raise HTTPException(404, "Job not found")
    return {"success": True, "data": {"message": "Job deleted"}, "error": None}