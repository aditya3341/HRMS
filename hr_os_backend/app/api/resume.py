"""Resume API — native MongoDB."""

import json
import shutil
import os
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends

from app.core.mongodb import get_mongo_db
from app.auth.constants import Permissions
from app.auth.permission import require_permission
from app.auth.deps import get_current_user

router = APIRouter(prefix="/resume", tags=["Resume"])


@router.post(
    "/{application_id}",
    dependencies=[Depends(require_permission(Permissions.RESUME_UPLOAD))],
)
def upload_resume(
    application_id: str,
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    db = get_mongo_db()
    application = db.applications.find_one({"_id": application_id, "entity_id": current_user["entity_id"]})

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    os.makedirs("resumes", exist_ok=True)
    file_path = f"resumes/{file.filename}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Simplified parsing for the mock/standalone version
    parsed_data = {
        "skills": ["Python", "FastAPI", "MongoDB", "React", "TypeScript"],
        "experience_years": 4,
        "education": "Bachelor of Technology",
    }

    db.applications.update_one({"_id": application_id}, {"$set": {
        "resume_url": file_path,
        "parsed_data": json.dumps(parsed_data),
        "status": "RESUME_UPLOADED",
    }})

    return {
        "success": True,
        "data": {
            "message": "Resume uploaded & parsed",
            "parsed_data": parsed_data,
        },
        "error": None,
    }