"""Applications API — native MongoDB."""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from datetime import datetime
from uuid import uuid4

from app.core.mongodb import get_mongo_db
from app.auth.deps import get_current_user
from app.auth.constants import Permissions
from app.auth.permission import require_permission

router = APIRouter(prefix="/applications", tags=["Applications"])


@router.get("/", dependencies=[Depends(require_permission(Permissions.APPLICATION_READ))])
def list_applications(current_user=Depends(get_current_user), status: str | None = None, job_id: str | None = None):
    db = get_mongo_db()
    filt: dict = {"entity_id": current_user["entity_id"]}
    if status:
        filt["status"] = status.upper()
    if job_id:
        filt["job_id"] = job_id

    apps = list(db.applications.find(filt).sort("created_at", -1))
    for a in apps:
        a.pop("_id", None)
        if "created_at" in a and hasattr(a["created_at"], "isoformat"):
            a["created_at"] = a["created_at"].isoformat()
    return {"success": True, "data": apps, "error": None}


@router.get("/{app_id}", dependencies=[Depends(require_permission(Permissions.APPLICATION_READ))])
def get_application(app_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    app = db.applications.find_one({"_id": app_id})
    if not app:
        raise HTTPException(404, "Application not found")
    app.pop("_id", None)
    if "created_at" in app and hasattr(app["created_at"], "isoformat"):
        app["created_at"] = app["created_at"].isoformat()

    # Get interview logs
    interviews = list(db.interview_logs.find({"application_id": app_id}).sort("created_at", -1))
    for i in interviews:
        i.pop("_id", None)
        if "created_at" in i and hasattr(i["created_at"], "isoformat"):
            i["created_at"] = i["created_at"].isoformat()

    app["interviews"] = interviews
    return {"success": True, "data": app, "error": None}


@router.post("/", dependencies=[Depends(require_permission(Permissions.APPLICATION_READ))])
def create_application(
    candidate_name: str = Form(...),
    candidate_email: str = Form(...),
    job_id: str = Form(...),
    notes: str = Form(""),
    resume: UploadFile | None = File(None),
    current_user=Depends(get_current_user),
):
    db = get_mongo_db()
    aid = str(uuid4())
    resume_url = None
    if resume:
        import os
        os.makedirs("resumes", exist_ok=True)
        path = f"resumes/{aid}_{resume.filename}"
        with open(path, "wb") as f:
            f.write(resume.file.read())
        resume_url = path

    doc = {
        "_id": aid, "id": aid,
        "entity_id": current_user["entity_id"],
        "job_id": job_id,
        "candidate_name": candidate_name,
        "candidate_email": candidate_email,
        "resume_url": resume_url,
        "status": "APPLIED",
        "notes": notes,
        "created_at": datetime.utcnow(),
    }
    db.applications.insert_one(doc)
    doc.pop("_id", None)
    doc["created_at"] = doc["created_at"].isoformat()
    return {"success": True, "data": doc, "error": None}


@router.patch("/{app_id}/status", dependencies=[Depends(require_permission(Permissions.APPLICATION_REVIEW))])
def update_application_status(app_id: str, current_user=Depends(get_current_user), status: str = ""):
    db = get_mongo_db()
    app = db.applications.find_one({"_id": app_id})
    if not app:
        raise HTTPException(404, "Application not found")

    db.applications.update_one({"_id": app_id}, {"$set": {"status": status.upper()}})
    return {"success": True, "data": {"message": f"Status updated to {status.upper()}"}, "error": None}


@router.patch("/{app_id}", dependencies=[Depends(require_permission(Permissions.APPLICATION_REVIEW))])
def update_application(app_id: str, current_user=Depends(get_current_user),
                       status: str | None = None, notes: str | None = None):
    db = get_mongo_db()
    app = db.applications.find_one({"_id": app_id})
    if not app:
        raise HTTPException(404, "Application not found")

    updates = {}
    if status:
        updates["status"] = status.upper()
    if notes is not None:
        updates["notes"] = notes
    if updates:
        db.applications.update_one({"_id": app_id}, {"$set": updates})
    return {"success": True, "data": {"message": "Application updated"}, "error": None}
