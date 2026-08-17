from sqlalchemy.orm import Session
from app.models.permission import Permission
from app.models.role_permission import RolePermission
from app.auth.constants import Permissions as P

def seed_role_permissions(db: Session):
    """
    Seeds permissions and maps them to roles (String-based).
    Roles: hr_admin, hr_recruiter, it_admin, employee, super_admin
    """
    # 1. Define all permissions to ensure they exist in DB
    permission_codes = [
        # Dashboard
        P.DASHBOARD_READ,
        # Jobs
        P.JOB_CREATE, P.JOB_READ,
        # Applications
        P.APPLICATION_READ, P.APPLICATION_REVIEW,
        # Offers
        P.OFFER_CREATE, P.OFFER_APPROVE, P.OFFER_SEND, P.OFFER_READ, P.OFFER_ACCEPT,
        # Onboarding
        P.ONBOARDING_START, P.ONBOARDING_READ, P.ONBOARDING_MANAGE,
        # Attendance
        P.ATTENDANCE_READ, P.ATTENDANCE_CHECKIN, P.ATTENDANCE_CHECKOUT, P.ATTENDANCE_MARK,
        # Payroll
        P.PAYROLL_READ, P.PAYROLL_RUN,
        # Assets
        P.ASSET_READ, P.ASSET_MANAGE,
        # Tickets
        P.TICKET_READ, P.TICKET_UPDATE,
        # Biometrics
        P.BIOMETRIC_READ, P.BIOMETRIC_MANAGE,
        # Leaves
        P.LEAVE_READ, P.LEAVE_REQUEST, P.LEAVE_APPROVE,
        # Employees
        P.EMPLOYEE_CREATE, P.EMPLOYEE_READ, P.EMPLOYEE_VIEW, P.EMPLOYEE_UPDATE,
        P.EMPLOYEE_SELF,
        # Others
        P.NOTIFICATION_READ, P.NOTIFICATION_SEND,
        P.RESUME_UPLOAD,
        P.ENTITY_READ, P.ENTITY_MANAGE
    ]

    for code in permission_codes:
        existing = db.query(Permission).filter(Permission.code == code).first()
        if not existing:
            new_p = Permission(code=code, description=code.replace(".", " ").title())
            db.add(new_p)
    
    db.commit()

    # 2. Define Role -> Permissions Mapping
    role_mappings = {
        "super_admin": permission_codes, # All
        "hr_admin": [
            P.DASHBOARD_READ, P.JOB_CREATE, P.JOB_READ, P.APPLICATION_READ, P.APPLICATION_REVIEW,
            P.OFFER_CREATE, P.OFFER_SEND, P.OFFER_READ, P.ONBOARDING_START, P.ONBOARDING_READ,
            P.ONBOARDING_MANAGE, P.EMPLOYEE_CREATE, P.EMPLOYEE_READ, P.EMPLOYEE_VIEW, P.EMPLOYEE_UPDATE,
            P.LEAVE_READ, P.LEAVE_APPROVE, P.NOTIFICATION_READ, P.NOTIFICATION_SEND, P.RESUME_UPLOAD
        ],
        "hr_recruiter": [
            P.DASHBOARD_READ, P.JOB_READ, P.APPLICATION_READ, P.APPLICATION_REVIEW,
            P.OFFER_CREATE, P.OFFER_SEND, P.OFFER_READ, P.RESUME_UPLOAD, P.NOTIFICATION_READ
        ],
        "it_admin": [
            P.DASHBOARD_READ, P.ONBOARDING_READ, P.ONBOARDING_MANAGE,
            P.ASSET_READ, P.ASSET_MANAGE, P.TICKET_READ, P.TICKET_UPDATE
        ],
        "employee": [
            P.DASHBOARD_READ, P.EMPLOYEE_SELF, P.ATTENDANCE_READ, P.ATTENDANCE_CHECKIN, 
            P.ATTENDANCE_CHECKOUT, P.LEAVE_READ, P.LEAVE_REQUEST, P.NOTIFICATION_READ
        ]
    }

    # 3. Seed Mappings
    for role, p_codes in role_mappings.items():
        for code in p_codes:
            perm = db.query(Permission).filter(Permission.code == code).first()
            if perm:
                existing_map = db.query(RolePermission).filter(
                    RolePermission.role == role,
                    RolePermission.permission_id == perm.id
                ).first()
                if not existing_map:
                    new_map = RolePermission(role=role, permission_id=perm.id)
                    db.add(new_map)
    
    db.commit()
    print(" RBAC Permissions Seeded Successfully")
