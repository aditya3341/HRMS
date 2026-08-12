"""Canonical identifier handling for company MongoDB and legacy data."""

from typing import Any
from uuid import UUID

from bson import ObjectId


def normalize_id(value: Any) -> Any:
    """Convert valid Mongo/legacy IDs and preserve business identifiers."""
    if isinstance(value, (ObjectId, UUID)) or value is None:
        return value
    if not isinstance(value, str):
        return value
    value = value.strip()
    if ObjectId.is_valid(value):
        return ObjectId(value)
    return value


def identity_filter(value: Any, *fields: str) -> dict[str, Any]:
    """Build a Mongo filter accepting canonical and legacy representations."""
    normalized = normalize_id(value)
    candidates = [normalized]
    string_value = str(value)
    if string_value not in candidates:
        candidates.append(string_value)
    clauses = [{field: {"$in": candidates}} for field in fields]
    return clauses[0] if len(clauses) == 1 else {"$or": clauses}
