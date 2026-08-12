"""Database helpers for MongoDB-native operations."""

from typing import Any


def as_uuid(value: Any) -> str:
    """Normalize an identifier to a string (MongoDB uses string _id)."""
    return str(value) if value is not None else ""


def validate_entity_match(record_entity_id, user_entity_id):
    """Raise HTTPException if entity IDs don't match."""
    from fastapi import HTTPException
    if str(record_entity_id) != str(user_entity_id):
        raise HTTPException(
            status_code=403,
            detail="Access denied: Record belongs to another entity.",
        )
