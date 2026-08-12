"""Automation API — native MongoDB."""

from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.mongodb import get_mongo_db
from app.auth.deps import get_current_user

router = APIRouter(prefix="/automation", tags=["Automation"])


class AutomationRuleCreate(BaseModel):
    trigger_event: str
    action_type: str
    conditions: dict = {}
    action_payload: dict = {}
    is_active: bool = True


@router.post("/rules")
def create_rule(
    rule_in: AutomationRuleCreate,
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Only SUPER_ADMIN can manage automation rules")

    db = get_mongo_db()
    rid = str(uuid4())
    doc = {
        "_id": rid,
        "id": rid,
        "entity_id": current_user["entity_id"],
        **rule_in.model_dump(),
    }
    db.automation_rules.insert_one(doc)
    doc.pop("_id", None)
    return {"success": True, "data": doc, "error": None}


@router.get("/rules")
def list_rules(
    current_user: dict = Depends(get_current_user),
):
    db = get_mongo_db()
    rules = list(db.automation_rules.find({"entity_id": current_user["entity_id"]}))
    for r in rules:
        r.pop("_id", None)
    return {"success": True, "data": rules, "error": None}


@router.patch("/rules/{rule_id}")
def toggle_rule(
    rule_id: str,
    is_active: bool,
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Only SUPER_ADMIN can manage automation rules")

    db = get_mongo_db()
    rule = db.automation_rules.find_one({"_id": rule_id, "entity_id": current_user["entity_id"]})
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    db.automation_rules.update_one({"_id": rule_id}, {"$set": {"is_active": is_active}})
    rule["is_active"] = is_active
    rule.pop("_id", None)
    return {"success": True, "data": rule, "error": None}
