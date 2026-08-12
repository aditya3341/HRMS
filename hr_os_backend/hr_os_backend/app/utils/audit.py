"""Audit logging — writes directly to MongoDB audit_logs collection."""

from datetime import datetime, timezone
from typing import Any, Optional
from uuid import uuid4

from app.core.mongodb import get_mongo_db


def log_audit(
    db=None,
    user: Any = None,
    action: str = "",
    module: str = "",
    resource_type: str = "",
    resource_id: str = "",
    old_values: Optional[dict] = None,
    new_values: Optional[dict] = None,
    metadata: Optional[dict] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    description: Optional[str] = None,
):
    """Insert an audit log document into MongoDB."""
    mongo = get_mongo_db()
    doc_id = str(uuid4())
    entity_id = user.get("entity_id", "") if isinstance(user, dict) else ""
    user_id = user.get("user_id", "") if isinstance(user, dict) else ""

    action_str = action.value if hasattr(action, "value") else str(action)

    meta = dict(metadata or {})
    if description:
        meta["description"] = description

    mongo.audit_logs.insert_one({
        "_id": doc_id,
        "id": doc_id,
        "entity_id": entity_id,
        "user_id": user_id,
        "action": action_str,
        "module": module,
        "resource_type": resource_type,
        "resource_id": str(resource_id),
        "old_values": old_values,
        "new_values": new_values,
        "metadata_json": meta,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "timestamp": datetime.now(timezone.utc),
    })
