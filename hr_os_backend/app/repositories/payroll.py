from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any

from bson import ObjectId

from app.core.mongodb import get_mongo_db
from app.repositories.attendance import employee_key, resolve_employee
from app.utils.identifiers import identity_filter


def _json_value(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, dict):
        return {key: _json_value(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_json_value(item) for item in value]
    return value


def serialize(document: dict) -> dict:
    result = {
        key: _json_value(value)
        for key, value in document.items()
        if key != "_id"
    }
    result["id"] = str(document["_id"])
    return result


def list_runs(entity_id: str) -> list[dict]:
    documents = (
        get_mongo_db()
        .payroll_runs.find({"entity_id": entity_id})
        .sort([("year", -1), ("month", -1), ("created_at", -1)])
    )
    return [serialize(document) for document in documents]


def get_run(run_id: str, entity_id: str) -> dict | None:
    document = get_mongo_db().payroll_runs.find_one(
        {
            **identity_filter(run_id, "_id", "id"),
            "entity_id": entity_id,
        }
    )
    return serialize(document) if document else None


def get_entries(run_id: str) -> list[dict]:
    documents = get_mongo_db().payroll_entries.find(
        identity_filter(run_id, "payroll_run_id")
    )
    return [serialize(document) for document in documents]


def employee_payslips(context: dict) -> list[dict]:
    employee = resolve_employee(context)
    if not employee:
        return []
    documents = (
        get_mongo_db()
        .payroll_entries.find({"employee_id": employee_key(employee)})
        .sort("created_at", -1)
    )
    return [serialize(document) for document in documents]
