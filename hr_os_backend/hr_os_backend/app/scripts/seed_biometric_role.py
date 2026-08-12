import uuid
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.permission import Permission
from app.models.role_permission import RolePermission

ROLE_NAME = "BIOMETRIC_DEVICE"
PERMISSION_CODES = [
    "biometric.device.register",
    "biometric.log.receive",
]


def seed_biometric_role():
    db: Session = SessionLocal()

    print(" Seeding BIOMETRIC_DEVICE role permissions...")

    permissions = db.query(Permission).filter(
        Permission.code.in_(PERMISSION_CODES)
    ).all()

    found_codes = {p.code for p in permissions}

    for code in PERMISSION_CODES:
        if code not in found_codes:
            raise Exception(f"❌ Missing permission: {code}")

    for permission in permissions:
        exists = db.query(RolePermission).filter(
            RolePermission.role == ROLE_NAME,
            RolePermission.permission_id == permission.id,
        ).first()

        if exists:
            print(f" Already mapped: {ROLE_NAME}  {permission.code}")
            continue

        rp = RolePermission(
            id=uuid.uuid4(),
            role=ROLE_NAME,
            permission_id=permission.id,
        )
        db.add(rp)
        print(f" Mapped {ROLE_NAME}  {permission.code}")

    db.commit()
    db.close()
    print(" BIOMETRIC_DEVICE role ready")


if __name__ == "__main__":
    seed_biometric_role()