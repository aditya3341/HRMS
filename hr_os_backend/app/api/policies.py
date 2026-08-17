"""Policies API — native MongoDB."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.mongodb import get_mongo_db
from app.auth.deps import get_current_user
from app.models.enums import EmployeeStatus

router = APIRouter(prefix="/policies", tags=["Policies"])


class PolicyAcceptRequest(BaseModel):
    employee_id: str | None = None


@router.post("/accept")
def accept_policies(
    payload: PolicyAcceptRequest = None,
    current_user=Depends(get_current_user),
):
    db = get_mongo_db()
    entity_id = current_user["entity_id"]

    if payload and payload.employee_id:
        employee = db.employees.find_one({
            "_id": payload.employee_id,
            "entity_id": entity_id,
        })
    else:
        employee = db.employees.find_one({
            "email": current_user["email"],
            "entity_id": entity_id,
        })

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    updates = {"policies_accepted": True}
    if employee.get("documents_uploaded"):
        updates["status"] = "ACTIVE"

    db.employees.update_one({"_id": employee["_id"]}, {"$set": updates})

    return {"success": True, "data": {"message": "Policies accepted"}, "error": None}