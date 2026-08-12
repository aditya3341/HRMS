"""Notification service — MongoDB native."""

from datetime import datetime, timezone
from uuid import uuid4

from app.core.mongodb import get_mongo_db


def create_notification(
    user_id: str,
    title: str,
    message: str,
    notification_type: str = "INFO",
    entity_id: str = "",
    link: str | None = None,
    db=None,
):
    """Insert a notification document into MongoDB."""
    mongo = get_mongo_db()
    doc_id = str(uuid4())
    mongo.notifications.insert_one({
        "_id": doc_id,
        "id": doc_id,
        "user_id": str(user_id),
        "entity_id": entity_id,
        "title": title,
        "message": message,
        "type": notification_type,
        "link": link,
        "is_read": False,
        "created_at": datetime.now(timezone.utc),
    })
    return doc_id
