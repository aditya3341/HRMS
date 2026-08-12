from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from pymongo import ReturnDocument

from app.core.mongodb import get_mongo_db
from app.utils.identifiers import identity_filter


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def resolve_employee(context: dict) -> dict | None:
    database = get_mongo_db()
    employee_id = context.get("employee_id")
    if employee_id:
        employee = database.employees.find_one(
            identity_filter(employee_id, "_id", "employee_id")
        )
        if employee:
            return employee

    employee = database.employees.find_one(
        identity_filter(context.get("user_id"), "user_id", "user")
    )
    if employee:
        return employee

    email = context.get("email")
    if email:
        return database.employees.find_one(
            {"$or": [{"email": email}, {"work_email": email}, {"personal_email": email}]}
        )
    return None


def employee_key(employee: dict) -> str:
    return str(employee.get("employee_id") or employee["_id"])


def attendance_mode() -> dict[str, Any]:
    default = {
        "mode": "BIOMETRIC",
        "allow_manual": False,
        "auto_calculate_hours": True,
        "first_in_last_out": True,
    }
    setting = get_mongo_db().settings.find_one({"key": "ATTENDANCE_MODE_CONFIG"})
    if not setting:
        return default
    value = setting.get("value")
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            return default
    return {**default, **value} if isinstance(value, dict) else default


def _day_bounds(moment: datetime | None = None) -> tuple[datetime, datetime]:
    moment = moment or utc_now()
    start = datetime(moment.year, moment.month, moment.day, tzinfo=timezone.utc)
    return start, start.replace(hour=23, minute=59, second=59, microsecond=999999)


def find_today(employee: dict) -> dict | None:
    start, end = _day_bounds()
    return get_mongo_db().attendance_records.find_one(
        {
            "employee_id": employee_key(employee),
            "attendance_date": {"$gte": start, "$lte": end},
        }
    )


def history(employee: dict, month: int, year: int) -> list[dict]:
    start = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end = datetime(year, month + 1, 1, tzinfo=timezone.utc)
    return list(
        get_mongo_db()
        .attendance_records.find(
            {
                "employee_id": employee_key(employee),
                "attendance_date": {"$gte": start, "$lt": end},
            }
        )
        .sort("attendance_date", -1)
    )


def check_in(
    employee: dict,
    entity_id: str,
    *,
    ip_address: str,
    device_info: str,
    latitude: float | None,
    longitude: float | None,
    device_id: str | None,
) -> dict:
    now = utc_now()
    start, end = _day_bounds(now)
    key = employee_key(employee)
    existing = get_mongo_db().attendance_records.find_one(
        {
            "employee_id": key,
            "attendance_date": {"$gte": start, "$lte": end},
            "check_in": {"$ne": None},
        }
    )
    if existing:
        raise ValueError("Already checked in today")

    is_late = (now.hour, now.minute) > (9, 30)
    return get_mongo_db().attendance_records.find_one_and_update(
        {"employee_id": key, "attendance_date": {"$gte": start, "$lte": end}},
        {
            "$setOnInsert": {
                "_id": ObjectId(),
                "employee_id": key,
                "entity_id": entity_id,
                "attendance_date": start,
                "created_at": now,
            },
            "$set": {
                "check_in": now,
                "status": "LATE" if is_late else "PRESENT",
                "source": "MANUAL",
                "verification_status": "MANUAL",
                "is_late": is_late,
                "ip_address": ip_address,
                "device_info": device_info,
                "device_id": device_id,
                "latitude": latitude,
                "longitude": longitude,
                "updated_at": now,
            },
        },
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )


def check_out(employee: dict) -> dict:
    now = utc_now()
    start, end = _day_bounds(now)
    record = get_mongo_db().attendance_records.find_one(
        {
            "employee_id": employee_key(employee),
            "attendance_date": {"$gte": start, "$lte": end},
        }
    )
    if not record or not record.get("check_in"):
        raise ValueError("No check-in found for today")
    if record.get("check_out"):
        raise ValueError("Already checked out today")

    hours = round((now - record["check_in"]).total_seconds() / 3600, 2)
    return get_mongo_db().attendance_records.find_one_and_update(
        {"_id": record["_id"]},
        {"$set": {"check_out": now, "total_hours": hours, "updated_at": now}},
        return_document=ReturnDocument.AFTER,
    )


def serialize_record(record: dict) -> dict:
    attendance_date = record.get("attendance_date")
    return {
        "id": str(record["_id"]),
        "date": attendance_date.date().isoformat() if attendance_date else None,
        "status": record.get("status"),
        "check_in": record["check_in"].isoformat() if record.get("check_in") else None,
        "check_out": record["check_out"].isoformat() if record.get("check_out") else None,
        "total_hours": record.get("total_hours"),
        "is_late": bool(record.get("is_late", False)),
        "location_name": record.get("location_name"),
        "verification_status": record.get("verification_status"),
        "selfie_url": record.get("selfie_url"),
        "source": record.get("source"),
    }
