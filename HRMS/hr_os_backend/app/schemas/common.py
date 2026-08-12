"""
=============================================================
 HR OS — Pydantic Schemas: common.py
 Shared envelope for ALL API responses.
=============================================================
"""
from pydantic import BaseModel
from typing import Any, Optional


class APIResponse(BaseModel):
    """
    Standard API response envelope.
    ALL endpoints must return this shape:
    {
        "success": true | false,
        "data":    { ... } | [...] | null,
        "error":   null | "Error description"
    }
    """
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None


def ok(data: Any = None) -> dict:
    """Shorthand for a successful response."""
    return {"success": True, "data": data, "error": None}


def err(message: str, data: Any = None) -> dict:
    """Shorthand for an error response."""
    return {"success": False, "data": data, "error": message}
