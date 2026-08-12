import uuid
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.permission import Permission
from app.models.role_permission import RolePermission

def seed_role_permissions():
    db: Session = SessionLocal()

    print(" Mapping permissions to roles...")

    permissions = db.query(Permission).all()
    
    # HR_ADMIN Permissions
    hr_admin_perms = [
        "onboarding.read", "onboarding.manage", "onboarding.start",
        "employee.read", "employee.view", "employee.create", "employee.update",
        "application.read", "application.review",
        "offer.read", "offer.create", "offer.approve", "offer.send",
        "job.read", "job.create",
        "dashboard.read", "notification.read", "notification.send"
    ]
    
    # HR_RECRUITER Permissions
    hr_recruiter_perms = [
        "onboarding.read", "onboarding.start",
        "employee.read", "employee.view",
        "application.read", "application.review",
        "offer.read", "offer.create",
        "job.read", "job.create",
        "dashboard.read", "notification.read"
    ]

    role_map = {
        "SUPER_ADMIN": [p.code for p in permissions],
        "HR_ADMIN": hr_admin_perms,
        "HR_RECRUITER": hr_recruiter_perms
    }

    for role_name, codes in role_map.items():
        for code in codes:
            perm = next((p for p in permissions if p.code == code), None)
            if not perm:
                print(f"  Permission not found: {code}")
                continue
                
            exists = (
                db.query(RolePermission)
                .filter(
                    RolePermission.role == role_name,
                    RolePermission.permission_id == perm.id,
                )
                .first()
            )

            if exists:
                continue

            rp = RolePermission(
                id=uuid.uuid4(),
                role=role_name,
                permission_id=perm.id,
            )
            db.add(rp)
            print(f" {role_name}  {perm.code}")

    db.commit()
    db.close()
    print(" Role-permission mapping updated")


if __name__ == "__main__":
    seed_role_permissions()