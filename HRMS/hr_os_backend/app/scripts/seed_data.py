"""
╔══════════════════════════════════════════════════════════════════╗
║              HR OS — Production-Grade Seed Script                ║
║                                                                  ║
║  Usage:                                                          ║
║    python -m app.scripts.seed_data                               ║
║                                                                  ║
║  Safety:                                                         ║
║    - Preserves SUPER_ADMIN user                                  ║
║    - Idempotent (safe to re-run)                                 ║
║    - Wrapped in transaction with rollback on failure             ║
╚══════════════════════════════════════════════════════════════════╝
"""

import uuid
import random
import logging
from datetime import datetime, date, timedelta

from faker import Faker
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.auth.password import get_password_hash
from app.models.entity import Entity
from app.models.user import User
from app.models.employee import Employee
from app.models.department import Department
from app.models.application import Application
from app.models.job import Job
from app.models.leave import LeaveType, LeaveBalance, Leave
from app.models.ticket import Ticket, TicketActivity
from app.models.it_ticket import ITTicket
from app.models.audit_log import AuditLog
from app.models.enums import (
    EmployeeStatus, LeaveStatus, TicketStatus, AuditAction, DayType
)

fake = Faker("en_IN")
logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

# ─── Constants ────────────────────────────────────────────────────────────────
SEED_PASSWORD = "Test@1234"
CURRENT_YEAR = datetime.utcnow().year

DEPARTMENT_NAMES = ["HR", "Sales", "Finance", "IT", "Management", "Operation", "Social Media Management", "Legal and Compliance", "Custom Clearance", "Legal"]

ROLES = {
    "HR_ADMIN": 2,
    "HR_RECRUITER": 3,
    "IT_ADMIN": 2,
    "EMPLOYEE": 40,
}

LEAVE_TYPES_DATA = [
    {"name": "Annual Leave",  "code": "ANNUAL", "max_per_year": 20, "is_paid": True,  "color": "#4CAF50"},
    {"name": "Sick Leave",    "code": "SICK",   "max_per_year": 10, "is_paid": True,  "color": "#F44336"},
    {"name": "Casual Leave",  "code": "CASUAL", "max_per_year": 5,  "is_paid": True,  "color": "#2196F3"},
]

LEAVE_REASONS = [
    "Family event", "Medical appointment", "Personal work",
    "Vacation", "Sick day", "Emergency", "Festival",
    "Eye checkup", "Parent's anniversary", "Car breakdown",
]

LEAVE_STATUSES = [LeaveStatus.PENDING, LeaveStatus.APPROVED, LeaveStatus.REJECTED]
LEAVE_STATUS_WEIGHTS = [3, 5, 2]  # More approved than pending/rejected

TICKET_TITLES = [
    "Laptop not booting", "VPN access required", "Email account setup",
    "Software installation request", "Printer not working", "Screen resolution issue",
    "Keyboard malfunction", "Network drive access", "Zoom background issues",
    "Password reset request", "New employee onboarding setup", "Storage space issue",
    "Project management tool access", "System running slow", "HDMI port broken",
    "USB ports not recognized", "Antivirus not updating", "WiFi disconnecting",
    "CRM access needed", "Can't access company portal",
]

TICKET_DESCRIPTIONS = [
    "The system is not responding and requires immediate attention.",
    "Need access as soon as possible for an ongoing project.",
    "Please set up the software before the week ends.",
    "This issue is blocking our daily operations.",
    "Please resolve at the earliest convenience.",
]

TICKET_CATEGORIES = ["IT", "ADMIN", "FINANCE", "HR"]
TICKET_PRIORITIES = ["LOW", "MEDIUM", "HIGH"]
TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]
IT_TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]

AUDIT_MODULES = ["LEAVE", "EMPLOYEE", "TICKET", "AUTH"]
AUDIT_ACTIONS = [
    AuditAction.LEAVE_APPLIED, AuditAction.LEAVE_APPROVED, AuditAction.LEAVE_REJECTED,
    AuditAction.EMPLOYEE_UPDATED, AuditAction.TICKET_CREATED, AuditAction.TICKET_UPDATED,
    AuditAction.LOGIN_SUCCESS,
    AuditAction.LOGIN_FAILED,
]


# ─── Helpers ──────────────────────────────────────────────────────────────────

def random_date_in_year(year: int = CURRENT_YEAR) -> date:
    start = date(year, 1, 1)
    end = date(year, 12, 28)
    return start + timedelta(days=random.randint(0, (end - start).days))


def random_leave_range(year: int = CURRENT_YEAR):
    start = random_date_in_year(year)
    duration = random.randint(1, 5)
    end = start + timedelta(days=duration - 1)
    return start, end, float(duration)


def truncate_seeded_data(db: Session, entity_id: uuid.UUID):
    """
    Delete all seeded data for entity EXCEPT SUPER_ADMIN users.
    Cascades in ordered fashion.
    """
    logger.info("🗑️  Clearing existing seeded data (preserving SUPER_ADMIN)...")

    # Audit logs
    db.query(AuditLog).filter(AuditLog.entity_id == entity_id).delete(synchronize_session="fetch")

    # Tickets + related
    from app.models.ticket import TicketComment, TicketActivity
    ticket_ids = [t.id for t in db.query(Ticket.id).filter(Ticket.entity_id == entity_id).all()]
    if ticket_ids:
        db.query(TicketComment).filter(TicketComment.ticket_id.in_(ticket_ids)).delete(synchronize_session="fetch")
        db.query(TicketActivity).filter(TicketActivity.ticket_id.in_(ticket_ids)).delete(synchronize_session="fetch")
        db.query(Ticket).filter(Ticket.id.in_(ticket_ids)).delete(synchronize_session="fetch")

    # IT Tickets
    db.query(ITTicket).filter(ITTicket.entity_id == entity_id).delete(synchronize_session="fetch")

    # Leaves + balances
    emp_ids = [e.id for e in db.query(Employee.id).filter(Employee.entity_id == entity_id).all()]
    if emp_ids:
        db.query(Leave).filter(Leave.employee_id.in_(emp_ids)).delete(synchronize_session="fetch")
        db.query(LeaveBalance).filter(LeaveBalance.employee_id.in_(emp_ids)).delete(synchronize_session="fetch")

    # Leave types
    db.query(LeaveType).filter(LeaveType.entity_id == entity_id).delete(synchronize_session="fetch")

    # Applications linked to employees
    app_ids = [
        e.application_id
        for e in db.query(Employee.application_id).filter(Employee.entity_id == entity_id).all()
        if e.application_id
    ]

    # Employees (nullify managers first to avoid FK loops)
    db.query(Employee).filter(Employee.entity_id == entity_id).update(
        {Employee.manager_id: None, Employee.manager_user_id: None},
        synchronize_session="fetch"
    )
    db.query(Employee).filter(Employee.entity_id == entity_id).delete(synchronize_session="fetch")

    if app_ids:
        db.query(Application).filter(Application.id.in_(app_ids)).delete(synchronize_session="fetch")

    # Departments
    db.query(Job).filter(Job.entity_id == entity_id).delete(synchronize_session="fetch")
    db.query(Department).filter(Department.entity_id == entity_id).delete(synchronize_session="fetch")

    # Users — preserve SUPER_ADMIN
    db.query(User).filter(
        User.entity_id == entity_id,
        User.role != "SUPER_ADMIN"
    ).delete(synchronize_session="fetch")

    db.flush()
    logger.info("✅ Cleared. SUPER_ADMIN preserved.")


# ─── Main Seed ────────────────────────────────────────────────────────────────

def run_seed():
    db: Session = SessionLocal()
    try:
        logger.info("🌱 Starting HR OS Seed Script...")

        # ── 1. Resolve or create Entity ───────────────────────────────────────
        entity = db.query(Entity).filter(Entity.code == "ZIPADESK").first()
        if not entity:
            entity = Entity(name="Zipaworld Technologies", code="ZIPADESK")
            db.add(entity)
            db.flush()
            logger.info(f"🏢 Created entity: {entity.name} ({entity.id})")
        else:
            logger.info(f"🏢 Using existing entity: {entity.name} ({entity.id})")

        entity_id: uuid.UUID = entity.id

        # ── 2. Clean slate (preserving SUPER_ADMIN) ───────────────────────────
        truncate_seeded_data(db, entity_id)

        # ── 3. Resolve SUPER_ADMIN ────────────────────────────────────────────
        super_admin = db.query(User).filter(
            User.entity_id == entity_id,
            User.role == "SUPER_ADMIN"
        ).first()

        if not super_admin:
            super_admin = User(
                email="admin@zipadesk.com",
                password_hash=get_password_hash(SEED_PASSWORD),
                role="SUPER_ADMIN",
                entity_id=entity_id,
            )
            db.add(super_admin)
            db.flush()
            logger.info(f"👑 Created SUPER_ADMIN: {super_admin.email}")
        else:
            logger.info(f"👑 Preserved SUPER_ADMIN: {super_admin.email}")
            
        # ── 3.1 Jobs ──────────────────────────────────────────────────────────
        logger.info("💼 Creating Jobs...")
        job_titles = ["IT Manager", "Data Scientist", "Software Engineer", "HR Specialist", "IT Support"]
        jobs = []
        for title in job_titles:
            job = Job(
                title=title,
                description=f"Standard role for {title}",
                location="Remote / Bangalore",
                employment_type="FULL_TIME",
                entity_id=entity_id,
                created_by=super_admin.id
            )
            db.add(job)
            db.flush()
            jobs.append(job)
        logger.info(f"   ✅ Created {len(jobs)} Active Jobs.")

        # ── 4. Departments ─────────────────────────────────────────────────────
        logger.info("🏬 Creating departments...")
        departments: dict[str, Department] = {}
        for dept_name in DEPARTMENT_NAMES:
            dept = Department(name=dept_name, entity_id=entity_id)
            db.add(dept)
            db.flush()
            departments[dept_name] = dept
        logger.info(f"   ✅ {len(departments)} departments created")

        # ── 5. Seed Users + placeholder Employees ─────────────────────────────
        logger.info("👥 Creating users and employees...")

        all_users: list[User] = []
        all_employees: list[Employee] = []

        # Named roles first (non-EMPLOYEE)
        named_roles = [
            ("hr.admin1@zipadesk.com", "HR_ADMIN", "HR"),
            ("hr.admin2@zipadesk.com", "HR_ADMIN", "HR"),
            ("hr.recruiter1@zipadesk.com", "HR_RECRUITER", "HR"),
            ("hr.recruiter2@zipadesk.com", "HR_RECRUITER", "HR"),
            ("hr.recruiter3@zipadesk.com", "HR_RECRUITER", "HR"),
            ("it.admin1@zipadesk.com", "IT_ADMIN", "IT"),
            ("it.admin2@zipadesk.com", "IT_ADMIN", "IT"),
        ]

        named_employees: list[Employee] = []
        for email, role, dept_name in named_roles:
            first = fake.first_name()
            last = fake.last_name()
            full_name = f"{first} {last}"

            user = User(
                email=email,
                password_hash=get_password_hash(SEED_PASSWORD),
                role=role,
                entity_id=entity_id,
            )
            db.add(user)
            db.flush()

            # Minimal application placeholder
            app = Application(
                candidate_name=full_name,
                email=email,
                phone=fake.phone_number()[:15],
                status="JOINED",
                job_id=random.choice(jobs).id,
                entity_id=entity_id,
            )
            db.add(app)
            db.flush()

            emp = Employee(
                user_id=user.id,
                application_id=app.id,
                entity_id=entity_id,
                employee_code=f"EMP{str(uuid.uuid4().int)[:5]}",
                full_name=full_name,
                email=email,
                department_id=departments[dept_name].id,
                status="ACTIVE",
                date_of_joining=fake.date_between(start_date="-3y", end_date="-6m"),
            )
            db.add(emp)
            db.flush()

            all_users.append(user)
            all_employees.append(emp)
            named_employees.append(emp)

        # EMPLOYEE bulk
        dept_list = list(departments.values())
        for i in range(40):
            first = fake.first_name()
            last = fake.last_name()
            full_name = f"{first} {last}"
            safe_name = full_name.lower().replace(" ", ".")
            email = f"{safe_name}.{i+1}@zipadesk.com"
            dept = random.choice(dept_list)

            user = User(
                email=email,
                password_hash=get_password_hash(SEED_PASSWORD),
                role="EMPLOYEE",
                entity_id=entity_id,
            )
            db.add(user)
            db.flush()

            app = Application(
                candidate_name=full_name,
                email=email,
                phone=fake.phone_number()[:15],
                status="JOINED",
                job_id=random.choice(jobs).id,
                entity_id=entity_id,
            )
            db.add(app)
            db.flush()

            emp = Employee(
                user_id=user.id,
                application_id=app.id,
                entity_id=entity_id,
                employee_code=f"EMP{str(uuid.uuid4().int)[:5]}",
                full_name=full_name,
                email=email,
                department_id=dept.id,
                status="ACTIVE",
                date_of_joining=fake.date_between(start_date="-2y", end_date="-1m"),
            )
            db.add(emp)
            db.flush()

            all_users.append(user)
            all_employees.append(emp)

        logger.info(f"   ✅ {len(all_employees)} employees created")

        # ── 6. Manager Hierarchy ──────────────────────────────────────────────
        logger.info("🌳 Assigning manager hierarchy...")
        employee_only = all_employees[len(named_roles):]  # Only regular employees
        managers = named_employees[:4]  # HR_ADMINs and IT_ADMINs as managers

        for idx, emp in enumerate(employee_only):
            manager = managers[idx % len(managers)]
            emp.manager_id = manager.id
            emp.manager_user_id = manager.user_id

        db.flush()
        logger.info("   ✅ Manager assignments done")

        # ── 7. Leave Types ────────────────────────────────────────────────────
        logger.info("📄 Creating leave types...")
        leave_types: list[LeaveType] = []
        for lt_data in LEAVE_TYPES_DATA:
            lt = LeaveType(
                entity_id=entity_id,
                name=lt_data["name"],
                code=lt_data["code"],
                max_per_year=lt_data["max_per_year"],
                is_paid=lt_data["is_paid"],
                color=lt_data["color"],
                requires_approval=True,
                is_active=True,
            )
            db.add(lt)
            db.flush()
            leave_types.append(lt)
        logger.info(f"   ✅ {len(leave_types)} leave types created")

        # ── 8. Leave Balances ─────────────────────────────────────────────────
        logger.info("📊 Creating leave balances...")
        balance_count = 0
        for emp in all_employees:
            for lt in leave_types:
                allocated = lt.max_per_year or 10.0
                used = round(random.uniform(0, allocated * 0.6), 1)
                remaining = round(allocated - used, 1)
                balance = LeaveBalance(
                    employee_id=emp.id,
                    leave_type_id=lt.id,
                    year=CURRENT_YEAR,
                    allocated=allocated,
                    used=used,
                    remaining=remaining,
                )
                db.add(balance)
                balance_count += 1
        db.flush()
        logger.info(f"   ✅ {balance_count} leave balances created")

        # ── 9. Leave Requests ─────────────────────────────────────────────────
        logger.info("📝 Creating leave requests...")
        leave_count = 0
        hr_admin_user_id = named_employees[0].user_id  # HR_ADMIN to review

        for emp in all_employees:
            num_leaves = random.randint(2, 6)
            for _ in range(num_leaves):
                lt = random.choice(leave_types)
                start, end, days = random_leave_range()
                status = random.choices(LEAVE_STATUSES, weights=LEAVE_STATUS_WEIGHTS, k=1)[0]
                reviewed_at = datetime.utcnow() - timedelta(days=random.randint(1, 30)) if status != LeaveStatus.PENDING else None

                leave = Leave(
                    entity_id=entity_id,
                    employee_id=emp.id,
                    leave_type_id=lt.id,
                    leave_type=lt.code,
                    start_date=start,
                    end_date=end,
                    from_date=start,
                    to_date=end,
                    days=days,
                    reason=random.choice(LEAVE_REASONS),
                    status=status,
                    day_type=DayType.FULL_DAY,
                    applied_at=datetime.utcnow() - timedelta(days=random.randint(1, 60)),
                    reviewed_by=hr_admin_user_id if status != LeaveStatus.PENDING else None,
                    reviewed_at=reviewed_at,
                )
                db.add(leave)
                leave_count += 1

        db.flush()
        logger.info(f"   ✅ {leave_count} leave requests created")

        # ── 10. ZipaDesk Tickets ──────────────────────────────────────────────
        logger.info("🎫 Creating ZipaDesk Tickets...")
        ticket_count = 0
        it_admins = [e for e in named_employees if "it.admin" in e.email]

        for _ in range(random.randint(20, 30)):
            creator = random.choice(all_employees)
            assignee = random.choice(it_admins) if it_admins else creator
            status = random.choice(TICKET_STATUSES)
            priority = random.choice(TICKET_PRIORITIES)
            category = random.choice(TICKET_CATEGORIES)
            created_at = datetime.utcnow() - timedelta(days=random.randint(1, 90))

            sla_deadline = created_at + timedelta(hours={"LOW": 72, "MEDIUM": 48, "HIGH": 24}[priority])
            sla_status = "ON_TRACK" if sla_deadline > datetime.utcnow() else "BREACHED"

            ticket = Ticket(
                entity_id=entity_id,
                title=random.choice(TICKET_TITLES),
                description=random.choice(TICKET_DESCRIPTIONS),
                category=category,
                priority=priority,
                status=status,
                sla_deadline=sla_deadline,
                sla_status=sla_status,
                created_by=creator.id,
                assigned_to=assignee.id if status != "OPEN" else None,
                assigned_by=it_admins[0].id if status != "OPEN" else None,
                assigned_at=created_at + timedelta(hours=1) if status != "OPEN" else None,
                created_at=created_at,
                updated_at=created_at + timedelta(hours=random.randint(1, 48)),
            )
            db.add(ticket)
            db.flush()

            # Activity log
            activity = TicketActivity(
                ticket_id=ticket.id,
                activity_type="CREATED",
                description=f"Ticket created by {creator.full_name}",
                actor_id=creator.id,
                created_at=created_at,
            )
            db.add(activity)
            ticket_count += 1

        db.flush()
        logger.info(f"   ✅ {ticket_count} ZipaDesk tickets created")

        # ── 11. IT Tickets ────────────────────────────────────────────────────
        logger.info("🎟️  Creating IT Tickets...")
        it_ticket_count = 0
        for _ in range(random.randint(10, 20)):
            status = random.choice(IT_TICKET_STATUSES)
            it_ticket = ITTicket(
                entity_id=entity_id,
                title=random.choice(TICKET_TITLES),
                description=random.choice(TICKET_DESCRIPTIONS),
                status=status,
            )
            db.add(it_ticket)
            it_ticket_count += 1

        db.flush()
        logger.info(f"   ✅ {it_ticket_count} IT tickets created")

        # ── 12. Audit Logs ────────────────────────────────────────────────────
        logger.info("📜 Creating audit logs...")
        audit_count = 0
        all_user_ids = [u.id for u in all_users] + [super_admin.id]

        for _ in range(60):
            action = random.choice(AUDIT_ACTIONS)
            actor_id = random.choice(all_user_ids)
            resource_id = str(uuid.uuid4())
            module = {
                AuditAction.LEAVE_APPLIED: "LEAVE",
                AuditAction.LEAVE_APPROVED: "LEAVE",
                AuditAction.LEAVE_REJECTED: "LEAVE",
                AuditAction.EMPLOYEE_UPDATED: "EMPLOYEE",
                AuditAction.TICKET_CREATED: "TICKET",
                AuditAction.TICKET_UPDATED: "TICKET",
                AuditAction.LOGIN_SUCCESS: "AUTH",
            }.get(action, "SYSTEM")

            resource_type = {
                "LEAVE": "Leave",
                "EMPLOYEE": "Employee",
                "TICKET": "Ticket",
                "AUTH": "User",
            }.get(module, "System")

            audit = AuditLog(
                entity_id=entity_id,
                user_id=actor_id,
                action=action,
                module=module,
                resource_type=resource_type,
                resource_id=resource_id,
                old_values={"status": "PENDING"} if "LEAVE" in action else None,
                new_values={"status": "APPROVED"} if "LEAVE" in action else None,
                metadata_json={"seed": True},
                ip_address=fake.ipv4(),
                user_agent="Mozilla/5.0 (SeedScript)",
                created_at=datetime.utcnow() - timedelta(days=random.randint(0, 30)),
            )
            db.add(audit)
            audit_count += 1

        db.flush()
        logger.info(f"   ✅ {audit_count} audit logs created")

        # ── Commit ────────────────────────────────────────────────────────────
        db.commit()
        logger.info("")
        logger.info("╔══════════════════════════════════════╗")
        logger.info("║        ✅ SEED COMPLETE!              ║")
        logger.info("╠══════════════════════════════════════╣")
        logger.info(f"║  Entity:      {entity.name:<22s}║")
        logger.info(f"║  Employees:   {len(all_employees):<22d}║")
        logger.info(f"║  Leave Types: {len(leave_types):<22d}║")
        logger.info(f"║  Leaves:      {leave_count:<22d}║")
        logger.info(f"║  Tickets:     {ticket_count:<22d}║")
        logger.info(f"║  IT Tickets:  {it_ticket_count:<22d}║")
        logger.info(f"║  Audit Logs:  {audit_count:<22d}║")
        logger.info("╠══════════════════════════════════════╣")
        logger.info(f"║  Password for all: {SEED_PASSWORD:<17}║")
        logger.info("╚══════════════════════════════════════╝")

    except Exception as e:
        db.rollback()
        logger.error(f"❌ Seed failed, transaction rolled back: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
