import uuid
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.permission import Permission

PERMISSIONS = [
    # 🔐 Dashboard
    ("dashboard.read", "View dashboard"),

    # 💼 Jobs
    ("job.create", "Create jobs"),
    ("job.read", "View jobs"),

    # 📝 Applications
    ("application.read", "View applications"),
    ("application.review", "Review applications"),

    # 📄 Offers
    ("offer.create", "Create offers"),
    ("offer.approve", "Approve offers"),
    ("offer.send", "Send offers"),
    ("offer.read", "View offers"),
    ("offer.accept", "Internal accept offer mapping"),

    # 🚀 Onboarding
    ("onboarding.start", "Start onboarding process"),
    ("onboarding.read", "View onboarding dashboard"),
    ("onboarding.manage", "Manage onboarding tasks and completion"),

    # 👥 Employees
    ("employee.create", "Create employee records"),
    ("employee.read", "List employee records"),
    ("employee.view", "View employee profile detail"),
    ("employee.update", "Update employee records"),
    ("employee.self", "Access own employee data"),

    # 🕒 Attendance
    ("attendance.read", "View attendance records"),
    ("attendance.checkin", "Mark check-in"),
    ("attendance.checkout", "Mark check-out"),
    ("attendance.mark", "Manually mark attendance"),

    # 💰 Payroll
    ("payroll.read", "View payroll records"),
    ("payroll.run", "Process payroll"),

    # 💻 IT Assets
    ("asset.read", "View IT assets"),
    ("asset.manage", "Manage IT assets"),
    ("ticket.read", "View support tickets"),
    ("ticket.update", "Update support tickets"),

    # 🔐 Biometric
    ("biometric.read", "View biometric configuration"),
    ("biometric.manage", "Manage biometric devices"),
    ("biometric.device.register", "Register biometric devices"),
    ("biometric.log.receive", "Receive biometric attendance logs"),

    # 📅 Leaves
    ("leave.read", "View leave requests"),
    ("leave.request", "Submit leave requests"),
    ("leave.approve", "Approve/Reject leaves"),

    # 🔔 Notifications
    ("notification.read", "View notifications"),
    ("notification.send", "Send custom notifications"),
]


def seed_permissions():
    db: Session = SessionLocal()
    print(" Seeding system permissions...")

    for code, description in PERMISSIONS:
        exists = db.query(Permission).filter(
            Permission.code == code
        ).first()

        if exists:
            # Update description if it changed
            if exists.description != description:
                exists.description = description
                print(f" Updated permission: {code}")
            continue

        permission = Permission(
            id=uuid.uuid4(),
            code=code,
            description=description,
        )
        db.add(permission)
        print(f" Created permission: {code}")

    db.commit()
    db.close()
    print(" Permissions seeding complete")


if __name__ == "__main__":
    seed_permissions()