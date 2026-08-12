"""Employee Documents API — native MongoDB."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from datetime import datetime
from uuid import uuid4
import os

from app.core.mongodb import get_mongo_db
from app.auth.deps import get_current_user
from app.api.employees import verify_profile_access

router = APIRouter(prefix="/employee-docs", tags=["Employee Documents"])

@router.get("/{employee_id}")
def list_documents(employee_id: str, current_user=Depends(get_current_user)):
    verify_profile_access(employee_id, current_user)
    db = get_mongo_db()
    docs = list(db.employee_docs.find({"employee_id": employee_id}))
    for d in docs:
        d.pop("_id", None)
        if "uploaded_at" in d and hasattr(d["uploaded_at"], "isoformat"):
            d["uploaded_at"] = d["uploaded_at"].isoformat()
    return {"success": True, "data": docs, "error": None}

@router.post("/{employee_id}")
def upload_document(
    employee_id: str,
    doc_type: str = Form("OTHER"),
    name: str = Form(""),
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    verify_profile_access(employee_id, current_user)
    db = get_mongo_db()
    os.makedirs("employee_docs", exist_ok=True)
    did = str(uuid4())
    filename = f"{did}_{file.filename}"
    path = f"employee_docs/{filename}"
    with open(path, "wb") as f:
        f.write(file.file.read())

    doc = {
        "_id": did, "id": did,
        "employee_id": employee_id,
        "name": name or file.filename,
        "type": doc_type,
        "filename": filename,
        "path": path,
        "uploaded_at": datetime.utcnow(),
        "uploaded_by": current_user["user_id"],
    }
    db.employee_docs.insert_one(doc)
    db.employees.update_one({"_id": employee_id}, {"$set": {"documents_uploaded": True}})

    doc.pop("_id", None)
    doc["uploaded_at"] = doc["uploaded_at"].isoformat()
    return {"success": True, "data": doc, "error": None}

@router.delete("/{employee_id}/{doc_id}")
def delete_document(employee_id: str, doc_id: str, current_user=Depends(get_current_user)):
    verify_profile_access(employee_id, current_user)
    db = get_mongo_db()
    doc = db.employee_docs.find_one({"_id": doc_id, "employee_id": employee_id})
    if not doc:
        raise HTTPException(404, "Document not found")
    if doc.get("path") and os.path.exists(doc["path"]):
        os.remove(doc["path"])
    db.employee_docs.delete_one({"_id": doc_id})
    return {"success": True, "data": {"message": "Document deleted"}, "error": None}

from fastapi.responses import FileResponse

@router.get("/{employee_id}/{doc_id}/download")
def download_document(employee_id: str, doc_id: str, current_user=Depends(get_current_user)):
    verify_profile_access(employee_id, current_user)
    db = get_mongo_db()
    doc = db.employee_docs.find_one({"_id": doc_id, "employee_id": employee_id})
    if not doc:
        raise HTTPException(404, "Document not found")
    if not doc.get("path") or not os.path.exists(doc["path"]):
        raise HTTPException(404, "File not found on disk")
    return FileResponse(doc["path"], media_type="application/pdf", filename=doc.get("name"))