import uuid
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.entity import Entity
from app.models.user import User
from app.models.department import Department  # noqa: F401 - registers table metadata
from app.models.employee import Employee  # noqa: F401 - registers table metadata
from app.auth.password import get_password_hash  # ✅ bcrypt version


def seed():
    db: Session = SessionLocal()

    # ---- ENTITIES ----
    aaa2 = db.query(Entity).filter(Entity.code == "AAA2").first()
    if not aaa2:
        aaa2 = Entity(
            id=uuid.uuid4(),
            name="AAA2 Innovate",
            code="AAA2"
        )
        db.add(aaa2)
        db.commit()
        db.refresh(aaa2)
        print(" AAA2 entity created")
    else:
        print(" AAA2 entity already exists")

    zipa = db.query(Entity).filter(Entity.code == "ZIP").first()
    if not zipa:
        zipa = Entity(
            id=uuid.uuid4(),
            name="Zipaworld",
            code="ZIP"
        )
        db.add(zipa)
        db.commit()
        print(" Zipaworld entity created")
    else:
        print(" Zipaworld entity already exists")

    # ---- SUPER ADMIN ----
    admin = db.query(User).filter(User.email == "admin@aaa2.com").first()
    if not admin:
        admin = User(
            id=uuid.uuid4(),
            email="admin@aaa2.com",
            password_hash=get_password_hash("admin123"),  # ✅ bcrypt hash
            role="SUPER_ADMIN",
            entity_id=aaa2.id
        )
        db.add(admin)
        db.commit()
        print(" Super admin user created")
    else:
        print(" Super admin already exists")

    db.close()
    print(" Seeding completed safely")


if __name__ == "__main__":
    seed()
