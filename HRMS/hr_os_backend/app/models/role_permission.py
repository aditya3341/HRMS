import uuid
from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class RolePermission(Base):
    __tablename__ = "role_permissions"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )

    role: Mapped[str] = mapped_column()
    permission_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("permissions.id")
    )