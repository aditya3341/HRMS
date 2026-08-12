import uuid
from datetime import datetime
from sqlalchemy import Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column

class SoftDeleteMixin:
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    def soft_delete(self):
        self.is_deleted = True
        self.deleted_at = datetime.utcnow()
