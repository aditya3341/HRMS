import os
from typing import Any

from fastapi import HTTPException, status

from app.core.mongodb import get_mongo_db
from app.utils.identifiers import identity_filter


class UserContext(dict):
    """Dictionary-compatible auth context for existing REST and WS handlers."""

    def __getattr__(self, name: str) -> Any:
        if name == "id":
            name = "user_id"
        try:
            return self[name]
        except KeyError as exc:
            raise AttributeError(name) from exc


def default_entity_id() -> str:
    value = os.getenv("DEFAULT_ENTITY_ID", "").strip()
    if not value:
        raise RuntimeError(
            "DEFAULT_ENTITY_ID is required for the company MongoDB schema."
        )
    return value


def validate_auth_configuration() -> None:
    default_entity_id()


def context_from_user(user: dict, token_payload: dict | None = None) -> UserContext:
    payload = token_payload or {}
    employee_id = user.get("employee_id")
    if employee_id is None:
        employee = get_mongo_db().employees.find_one(
            identity_filter(user["_id"], "user_id", "user")
        )
        if employee:
            employee_id = employee.get("employee_id") or employee.get("_id")

    return UserContext(
        user_id=str(user["_id"]),
        email=user.get("email") or payload.get("email"),
        role=user.get("role") or payload.get("role") or "EMPLOYEE",
        entity_id=default_entity_id(),
        employee_id=str(employee_id) if employee_id is not None else None,
    )


def find_user_by_id(value: Any) -> dict:
    user = get_mongo_db().users.find_one(identity_filter(value, "_id", "id"))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists. Please re-login.",
        )
    return user
