"""
seed_role_permissions.py
Seeds role->permission mappings so that HR, MANAGER, EMPLOYEE roles
can actually access their respective functionality.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.entity import Entity   # noqa - needed for FK resolution
from app.models.permission import Permission
from app.models.role_permission import RolePermission
from app.core.database import SessionLocal
from app.auth.constants import Permissions as P

# Define which roles get which permissions
ROLE_PERMISSIONS = {
    "SUPER_ADMIN": [
        # Gets EVERYTHING - handled via code (queries all permissions)
        # But we still add them so the mapping is explicit
        P.DASHBOARD_READ, P.ADMIN, P.ADMIN_WRITE,
        P.JOB_CREATE, P.JOB_READ,
        P.APPLICATION_READ, P.APPLICATION_REVIEW,
        P.OFFER_CREATE, P.OFFER_APPROVE, P.OFFER_SEND, P.OFFER_READ, P.OFFER_ACCEPT,
        P.ONBOARDING_START, P.ONBOARDING_READ, P.ONBOARDING_MANAGE,
        P.ATTENDANCE_READ, P.ATTENDANCE_CHECKIN, P.ATTENDANCE_CHECKOUT, P.ATTENDANCE_MARK,
        P.PAYROLL_READ, P.PAYROLL_RUN,
        P.ASSET_READ, P.ASSET_MANAGE,
        P.TICKET_READ, P.TICKET_UPDATE,
        P.BIOMETRIC_READ, P.BIOMETRIC_MANAGE,
        P.LEAVE_READ, P.LEAVE_REQUEST, P.LEAVE_APPROVE,
        P.NOTIFICATION_READ, P.NOTIFICATION_SEND,
        P.EMPLOYEE_SELF, P.EMPLOYEE_CREATE, P.EMPLOYEE_READ, P.EMPLOYEE_VIEW, P.EMPLOYEE_UPDATE,
        P.RESUME_UPLOAD,
        P.PERFORMANCE_VIEW, P.PERFORMANCE_MANAGE, P.PERFORMANCE_ADMIN,
        P.APPRAISAL_MANAGE, P.PROMOTION_MANAGE,
        P.ENTITY_READ, P.ENTITY_MANAGE,
    ],

    "ADMIN": [
        P.DASHBOARD_READ,
        P.JOB_CREATE, P.JOB_READ,
        P.APPLICATION_READ, P.APPLICATION_REVIEW,
        P.OFFER_CREATE, P.OFFER_APPROVE, P.OFFER_SEND, P.OFFER_READ,
        P.ONBOARDING_START, P.ONBOARDING_READ, P.ONBOARDING_MANAGE,
        P.ATTENDANCE_READ, P.ATTENDANCE_CHECKIN, P.ATTENDANCE_CHECKOUT, P.ATTENDANCE_MARK,
        P.PAYROLL_READ, P.PAYROLL_RUN,
        P.ASSET_READ, P.ASSET_MANAGE,
        P.TICKET_READ, P.TICKET_UPDATE,
        P.LEAVE_READ, P.LEAVE_REQUEST, P.LEAVE_APPROVE,
        P.NOTIFICATION_READ,
        P.EMPLOYEE_SELF, P.EMPLOYEE_CREATE, P.EMPLOYEE_READ, P.EMPLOYEE_VIEW, P.EMPLOYEE_UPDATE,
        P.RESUME_UPLOAD,
        P.PERFORMANCE_VIEW, P.PERFORMANCE_MANAGE, P.PERFORMANCE_ADMIN,
        P.APPRAISAL_MANAGE,
        P.ENTITY_READ,
    ],

    "HR_ADMIN": [
        P.DASHBOARD_READ,
        P.JOB_CREATE, P.JOB_READ,
        P.APPLICATION_READ, P.APPLICATION_REVIEW,
        P.OFFER_CREATE, P.OFFER_APPROVE, P.OFFER_SEND, P.OFFER_READ,
        P.ONBOARDING_START, P.ONBOARDING_READ, P.ONBOARDING_MANAGE,
        P.ATTENDANCE_READ, P.ATTENDANCE_CHECKIN, P.ATTENDANCE_CHECKOUT, P.ATTENDANCE_MARK,
        P.PAYROLL_READ, P.PAYROLL_RUN,
        P.ASSET_READ, P.ASSET_MANAGE,
        P.TICKET_READ, P.TICKET_UPDATE,
        P.LEAVE_READ, P.LEAVE_REQUEST, P.LEAVE_APPROVE,
        P.NOTIFICATION_READ,
        P.EMPLOYEE_SELF, P.EMPLOYEE_CREATE, P.EMPLOYEE_READ, P.EMPLOYEE_VIEW, P.EMPLOYEE_UPDATE,
        P.RESUME_UPLOAD,
        P.PERFORMANCE_VIEW, P.PERFORMANCE_MANAGE, P.PERFORMANCE_ADMIN,
        P.APPRAISAL_MANAGE,
        P.ENTITY_READ,
    ],

    "HR": [
        P.DASHBOARD_READ,
        P.JOB_CREATE, P.JOB_READ,
        P.APPLICATION_READ, P.APPLICATION_REVIEW,
        P.OFFER_CREATE, P.OFFER_APPROVE, P.OFFER_SEND, P.OFFER_READ,
        P.ONBOARDING_START, P.ONBOARDING_READ, P.ONBOARDING_MANAGE,
        P.ATTENDANCE_READ, P.ATTENDANCE_CHECKIN, P.ATTENDANCE_CHECKOUT,
        P.PAYROLL_READ,
        P.ASSET_READ, P.ASSET_MANAGE,
        P.TICKET_READ, P.TICKET_UPDATE,
        P.LEAVE_READ, P.LEAVE_REQUEST, P.LEAVE_APPROVE,
        P.NOTIFICATION_READ,
        P.EMPLOYEE_SELF, P.EMPLOYEE_CREATE, P.EMPLOYEE_READ, P.EMPLOYEE_VIEW, P.EMPLOYEE_UPDATE,
        P.RESUME_UPLOAD,
        P.PERFORMANCE_VIEW, P.PERFORMANCE_MANAGE,
        P.ENTITY_READ,
    ],

    "MANAGER": [
        P.DASHBOARD_READ,
        P.JOB_READ,
        P.APPLICATION_READ,
        P.OFFER_READ,
        P.ONBOARDING_READ,
        P.ATTENDANCE_READ, P.ATTENDANCE_CHECKIN, P.ATTENDANCE_CHECKOUT,
        P.TICKET_READ, P.TICKET_UPDATE,
        P.ASSET_READ,
        P.LEAVE_READ, P.LEAVE_REQUEST, P.LEAVE_APPROVE,
        P.NOTIFICATION_READ,
        P.EMPLOYEE_SELF, P.EMPLOYEE_READ, P.EMPLOYEE_VIEW,
        P.PERFORMANCE_VIEW, P.PERFORMANCE_MANAGE,
        P.ENTITY_READ,
    ],

    "EMPLOYEE": [
        P.DASHBOARD_READ,
        P.ATTENDANCE_CHECKIN, P.ATTENDANCE_CHECKOUT,
        P.TICKET_READ, P.TICKET_UPDATE,
        P.ASSET_READ,
        P.LEAVE_READ, P.LEAVE_REQUEST,
        P.NOTIFICATION_READ,
        P.EMPLOYEE_SELF, P.EMPLOYEE_VIEW,
        P.PERFORMANCE_VIEW,
        P.OFFER_ACCEPT,
    ],
}


def seed_role_permissions():
    db = SessionLocal()
    try:
        print("Seeding role permissions...")

        # Get all permission objects
        all_perms = {p.code: p for p in db.query(Permission).all()}
        print(f"  Found {len(all_perms)} permission codes in DB")

        if not all_perms:
            print("  ERROR: No permissions found in DB. Run seed_permissions.py first!")
            return

        total_created = 0
        total_skipped = 0

        for role, perm_codes in ROLE_PERMISSIONS.items():
            for code in perm_codes:
                perm = all_perms.get(code)
                if not perm:
                    print(f"  WARNING: Permission '{code}' not found in DB, skipping")
                    continue

                existing = db.query(RolePermission).filter_by(
                    role=role, permission_id=perm.id
                ).first()

                if not existing:
                    rp = RolePermission(role=role, permission_id=perm.id)
                    db.add(rp)
                    total_created += 1
                else:
                    total_skipped += 1

        db.commit()
        print(f"  Created: {total_created} role-permission mappings")
        print(f"  Already existed: {total_skipped}")
        print("Done!")

    except Exception as e:
        import traceback
        db.rollback()
        print(f"ERROR: {e}")
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    seed_role_permissions()
