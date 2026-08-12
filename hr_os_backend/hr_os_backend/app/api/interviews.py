"""Interviews API — native MongoDB."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime
from uuid import uuid4

from app.core.mongodb import get_mongo_db
from app.auth.deps import get_current_user
from app.auth.constants import Permissions
from app.auth.permission import require_permission

router = APIRouter(prefix="/interviews", tags=["Interviews"])

class InterviewCreate(BaseModel):
    application_id: str
    round: str = "L1"
    interviewer: str = ""
    scheduled_at: str | None = None
    notes: str = ""

class InterviewFeedback(BaseModel):
    feedback: str = ""
    rating: int = 3
    result: str = "PENDING"  # PASS, FAIL, PENDING

@router.get("/", dependencies=[Depends(require_permission(Permissions.APPLICATION_READ))])
def list_interviews(current_user=Depends(get_current_user), application_id: str | None = None):
    db = get_mongo_db()
    filt: dict = {"entity_id": current_user["entity_id"]}
    if application_id:
        filt["application_id"] = application_id
    interviews = list(db.interview_logs.find(filt).sort("created_at", -1))
    for i in interviews:
        i.pop("_id", None)
        for key in ["created_at", "scheduled_at"]:
            if key in i and hasattr(i[key], "isoformat"):
                i[key] = i[key].isoformat()
    return {"success": True, "data": interviews, "error": None}

@router.post("/", dependencies=[Depends(require_permission(Permissions.APPLICATION_REVIEW))])
def create_interview(payload: InterviewCreate, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    iid = str(uuid4())
    scheduled = datetime.strptime(payload.scheduled_at, "%Y-%m-%dT%H:%M") if payload.scheduled_at else None
    doc = {
        "_id": iid, "id": iid,
        "entity_id": current_user["entity_id"],
        "application_id": payload.application_id,
        "round": payload.round,
        "interviewer": payload.interviewer,
        "scheduled_at": scheduled,
        "notes": payload.notes,
        "feedback": "",
        "rating": 0,
        "result": "PENDING",
        "created_at": datetime.utcnow(),
    }
    db.interview_logs.insert_one(doc)
    doc.pop("_id", None)
    for key in ["created_at", "scheduled_at"]:
        if key in doc and doc[key] and hasattr(doc[key], "isoformat"):
            doc[key] = doc[key].isoformat()
    return {"success": True, "data": doc, "error": None}

@router.patch("/{interview_id}/feedback", dependencies=[Depends(require_permission(Permissions.APPLICATION_REVIEW))])
def submit_feedback(interview_id: str, payload: InterviewFeedback, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    result = db.interview_logs.update_one({"_id": interview_id}, {"$set": {
        "feedback": payload.feedback, "rating": payload.rating, "result": payload.result.upper(),
    }})
    if result.matched_count == 0:
        raise HTTPException(404, "Interview not found")
    return {"success": True, "data": {"message": "Feedback submitted"}, "error": None}


@router.post("/{application_id}/move", dependencies=[Depends(require_permission(Permissions.APPLICATION_REVIEW))])
def move_application_status(
    application_id: str,
    to_status: str,
    current_user=Depends(get_current_user),
):
    db = get_mongo_db()
    app = db.applications.find_one({"_id": application_id})
    if not app:
        raise HTTPException(404, "Application not found")

    db.applications.update_one({"_id": application_id}, {"$set": {"status": to_status.upper()}})

    # Create employee stub if moved to Selected / Onboarding
    if to_status.upper() in ("ONBOARDING_STARTED", "SELECTED"):
        existing_emp = db.employees.find_one({"email": app.get("candidate_email"), "entity_id": current_user["entity_id"]})
        if not existing_emp:
            eid = str(uuid4())
            db.employees.insert_one({
                "_id": eid, "id": eid,
                "entity_id": current_user["entity_id"],
                "full_name": app.get("candidate_name"),
                "email": app.get("candidate_email"),
                "status": "ONBOARDING",
                "employee_code": f"TEMP-{datetime.utcnow().strftime('%M%S')}",
                "documents_uploaded": False,
                "policies_accepted": False,
                "created_at": datetime.utcnow()
            })

    # Insert status log
    lid = str(uuid4())
    db.interview_logs.insert_one({
        "_id": lid, "id": lid,
        "entity_id": current_user["entity_id"],
        "application_id": application_id,
        "round": to_status.upper(),
        "interviewer": "System",
        "scheduled_at": None,
        "notes": f"Moved to status: {to_status.upper()}",
        "feedback": "",
        "rating": 0,
        "result": "PASS",
        "created_at": datetime.utcnow(),
    })

    return {"success": True, "data": {"message": f"Application moved to {to_status.upper()}"}, "error": None}