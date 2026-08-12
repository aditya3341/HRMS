"""
╔══════════════════════════════════════════════════════════════════╗
║        HR OS — Enterprise Reset & Structured Seed Script         ║
║                                                                  ║
║  Goal:                                                           ║
║    - Reset all system data safely                                ║
║    - Preserve/Create Ashish Talgotra as Root SUPER_ADMIN         ║
║    - Build a realistic Indian-biased Org Hierarchy               ║
║    - 5 Departments, 10 Managers, 50 Employees Total              ║
║                                                                  ║
║  Usage:                                                          ║
║    python -m app.scripts.reset_and_seed                          ║
╚══════════════════════════════════════════════════════════════════╝
"""

import uuid
import random
import logging
from datetime import datetime, date, timedelta

from faker import Faker
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import SessionLocal
from app.auth.password import get_password_hash
from app.models.entity import Entity
from app.models.user import User
from app.models.employee import Employee
from app.models.department import Department
from app.models.application import Application
from app.models.job import Job
from app.models.leave import LeaveType, LeaveBalance, Leave
from app.models.ticket import Ticket, TicketActivity, TicketComment
from app.models.it_ticket import ITTicket
from app.models.audit_log import AuditLog
from app.models.enums import (
    EmployeeStatus, LeaveStatus, TicketStatus, AuditAction, DayType
)

# Configuration
SEED_PASSWORD = "Test@1234"
ASHISH_EMAIL = "ashish@zipaworld.com"
ENTITY_CODE = "ZIPAWORLD"
CURRENT_YEAR = datetime.utcnow().year

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
logger = logging.getLogger(__name__)
fake = Faker("en_IN")

# Indian Name Lists for realistic bias
FIRST_NAMES_MALE = ["Amit", "Rahul", "Ankit", "Karan", "Sanjay", "Deepak", "Vikram", "Rohan", "Aditya", "Manish"]
FIRST_NAMES_FEMALE = ["Neha", "Priya", "Pooja", "Anjali", "Sneha", "Kavita", "Ritu", "Shweta", "Megha", "Ishita"]
LAST_NAMES = ["Sharma", "Verma", "Gupta", "Mehta", "Kapoor", "Singh", "Jain", "Reddy", "Patel", "Iyer"]

def get_indian_name():
    first = random.choice(FIRST_NAMES_MALE + FIRST_NAMES_FEMALE)
    last = random.choice(LAST_NAMES)
    return f"{first} {last}"

def random_date_in_year(year: int = CURRENT_YEAR) -> date:
    start = date(year, 1, 1)
    end = date(year, 12, 28)
    return start + timedelta(days=random.randint(0, (end - start).days))

# ─── Database Reset ───────────────────────────────────────────────────────────

def clear_database(db: Session, entity_id: uuid.UUID):
    """Safely reset all system data while preserving SUPER_ADMIN users."""
    logger.info("🗑️  Resetting database (preserving SUPER_ADMIN)...")
    
    # 1. Functional Data
    db.query(AuditLog).filter(AuditLog.entity_id == entity_id).delete()
    
    # Jobs (Clear after AuditLogs/Applications potentially)
    db.query(Job).filter(Job.entity_id == entity_id).delete()
    
    # Tickets
    ticket_ids = [t.id for t in db.query(Ticket.id).filter(Ticket.entity_id == entity_id).all()]
    if ticket_ids:
        db.query(TicketComment).filter(TicketComment.ticket_id.in_(ticket_ids)).delete(synchronize_session=False)
        db.query(TicketActivity).filter(TicketActivity.ticket_id.in_(ticket_ids)).delete(synchronize_session=False)
        db.query(Ticket).filter(Ticket.id.in_(ticket_ids)).delete(synchronize_session=False)
    
    db.query(ITTicket).filter(ITTicket.entity_id == entity_id).delete()
    
    # Leaves
    emp_ids = [e.id for e in db.query(Employee.id).filter(Employee.entity_id == entity_id).all()]
    if emp_ids:
        db.query(Leave).filter(Leave.employee_id.in_(emp_ids)).delete(synchronize_session=False)
        db.query(LeaveBalance).filter(LeaveBalance.employee_id.in_(emp_ids)).delete(synchronize_session=False)
    
    db.query(LeaveType).filter(LeaveType.entity_id == entity_id).delete()
    
    # 2. Org Structure (Bottom-Up)
    # Nullify hierarchy to avoid FK violations during delete
    db.query(Employee).filter(Employee.entity_id == entity_id).update({
        Employee.manager_id: None,
        Employee.manager_user_id: None
    })
    db.flush()
    
    db.query(Employee).filter(Employee.entity_id == entity_id).delete()
    db.query(Application).filter(Application.entity_id == entity_id).delete()
    db.query(Department).filter(Department.entity_id == entity_id).delete()
    
    # 3. Users (Exclude SUPER_ADMIN)
    db.query(User).filter(
        User.entity_id == entity_id,
        User.role != "SUPER_ADMIN"
    ).delete()
    
    db.commit()
    logger.info("✅ Database reset complete.")

# ─── Seeding Logic ────────────────────────────────────────────────────────────

def run_seed():
    db: Session = SessionLocal()
    try:
        # 1. Entity Setup
        entity = db.query(Entity).filter(Entity.code == ENTITY_CODE).first()
        if not entity:
            entity = Entity(name="Zipaworld Technologies", code=ENTITY_CODE)
            db.add(entity)
            db.flush()
        entity_id = entity.id
        
        # 2. Reset
        clear_database(db, entity_id)
        
        # 3. Ensure Ashish (Root Admin)
        ashish_user = db.query(User).filter(User.email == ASHISH_EMAIL).first()
        if not ashish_user:
            ashish_user = User(
                email=ASHISH_EMAIL,
                password_hash=get_password_hash(SEED_PASSWORD),
                role="SUPER_ADMIN",
                entity_id=entity_id
            )
            db.add(ashish_user)
            db.flush()
            logger.info(f"👑 Created Root Admin: {ASHISH_EMAIL}")
        else:
            logger.info(f"👑 Preserved Root Admin: {ASHISH_EMAIL}")
            
        # 3.1 Jobs
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
                created_by=ashish_user.id
            )
            db.add(job)
            db.flush()
            jobs.append(job)
        logger.info(f"   ✅ Created {len(jobs)} Active Jobs.")

        dept_names = ["HR", "Sales", "Finance", "IT", "Management", "Operation", "Social Media Management", "Legal and Compliance", "Custom Clearance", "Legal"]
        departments = {}
        for name in dept_names:
            dept = Department(name=name, entity_id=entity_id)
            db.add(dept)
            db.flush()
            departments[name] = dept
        logger.info(f"🏢 Created {len(dept_names)} Departments.")

        # 5. Create Ashish Employee Profile
        ashish_app = Application(
            candidate_name="Ashish Talgotra",
            email=ASHISH_EMAIL,
            phone="9999999999",
            status="JOINED",
            job_id=jobs[1].id,  # Data Scientist
            entity_id=entity_id
        )
        db.add(ashish_app)
        db.flush()
        
        ashish_emp = Employee(
            user_id=ashish_user.id,
            application_id=ashish_app.id,
            entity_id=entity_id,
            employee_code="ZWA001",
            full_name="Ashish Talgotra",
            email=ASHISH_EMAIL,
            department_id=departments["Data Science"].id,
            status="ACTIVE",
            date_of_joining=date(2020, 1, 1)
        )
        db.add(ashish_emp)
        db.flush()
        logger.info("👤 Created Ashish Employee Profile (Root node).")

        # 6. Create Department Managers (Level 1)
        manager_employees = []
        for dept_name, dept in departments.items():
            name = get_indian_name()
            email = f"{name.lower().replace(' ', '.')}@zipaworld.com"
            
            user = User(
                email=email,
                password_hash=get_password_hash(SEED_PASSWORD),
                role="HR_ADMIN" if dept_name == "HR" else "EMPLOYEE",
                entity_id=entity_id
            )
            db.add(user)
            db.flush()
            
            app = Application(
                candidate_name=name, email=email, phone=fake.phone_number()[:15],
                status="JOINED", job_id=random.choice(jobs).id, entity_id=entity_id
            )
            db.add(app)
            db.flush()
            
            mgr = Employee(
                user_id=user.id, application_id=app.id, entity_id=entity_id,
                employee_code=f"ZWM{str(uuid.uuid4().int)[:4]}",
                full_name=name, email=email, department_id=dept.id,
                status="ACTIVE", manager_id=ashish_emp.id, manager_user_id=ashish_user.id,
                date_of_joining=fake.date_between(start_date="-4y", end_date="-2y")
            )
            db.add(mgr)
            db.flush()
            manager_employees.append(mgr)
            
        logger.info(f"👨‍💼 Created {len(manager_employees)} Department Managers reporting to Ashish.")

        # 7. Create Employees (Level 2)
        all_employees = [ashish_emp] + manager_employees
        for i in range(40):
            name = get_indian_name()
            email = f"{name.lower().replace(' ', '.')}@zipaworld.com"
            
            # Ensure unique email if collision occurs
            if db.query(User).filter(User.email == email).first():
                email = f"{name.lower().replace(' ', '.')}.{i}@zipaworld.com"

            user = User(
                email=email, password_hash=get_password_hash(SEED_PASSWORD),
                role="EMPLOYEE", entity_id=entity_id
            )
            db.add(user)
            db.flush()
            
            app = Application(
                candidate_name=name, email=email, phone=fake.phone_number()[:15],
                status="JOINED", job_id=random.choice(jobs).id, entity_id=entity_id
            )
            db.add(app)
            db.flush()
            
            # Weighted choice for manager to distribute reasonably
            mgr = random.choice(manager_employees)
            
            emp = Employee(
                user_id=user.id, application_id=app.id, entity_id=entity_id,
                employee_code=f"ZWE{str(uuid.uuid4().int)[:4]}",
                full_name=name, email=email, department_id=mgr.department_id,
                status="ACTIVE", manager_id=mgr.id, manager_user_id=mgr.user_id,
                date_of_joining=fake.date_between(start_date="-2y", end_date="-2m")
            )
            db.add(emp)
            db.flush()
            all_employees.append(emp)
            
        logger.info(f"👥 Created 40 Employees distributed across departments.")

        # 8. Leave System
        logger.info("📄 Setting up Leave System...")
        leave_configs = [
            ("Annual Leave", "ANNUAL", 22),
            ("Sick Leave", "SICK", 12),
            ("Casual Leave", "CASUAL", 8)
        ]
        leave_types = []
        for name, code, limit in leave_configs:
            lt = LeaveType(entity_id=entity_id, name=name, code=code, max_per_year=limit)
            db.add(lt)
            db.flush()
            leave_types.append(lt)
            
        for emp in all_employees:
            for lt in leave_types:
                allocated = lt.max_per_year
                used = round(random.uniform(0, allocated * 0.4), 1)
                db.add(LeaveBalance(
                    employee_id=emp.id, leave_type_id=lt.id, year=CURRENT_YEAR,
                    allocated=allocated, used=used, remaining=allocated-used
                ))
                
        # Sample leaves
        for _ in range(30):
            emp = random.choice(all_employees)
            lt = random.choice(leave_types)
            start_date = random_date_in_year()
            days = random.randint(1, 4)
            end_date = start_date + timedelta(days=days-1)
            
            status = random.choice([LeaveStatus.PENDING, LeaveStatus.APPROVED, LeaveStatus.REJECTED])
            db.add(Leave(
                entity_id=entity_id, employee_id=emp.id, leave_type_id=lt.id,
                leave_type=lt.code, start_date=start_date, end_date=end_date,
                from_date=start_date, to_date=end_date, days=float(days),
                reason="Regular leave request for personal reasons.",
                status=status, applied_at=datetime.utcnow() - timedelta(days=random.randint(1, 10))
            ))
        db.flush()
        logger.info("✅ Leave System seeded.")

        # 9. Tickets (ZipaDesk)
        logger.info("🎫 Seeding Tickets...")
        it_mgr = [m for m in manager_employees if m.department_id == departments["IT"].id][0]
        for i in range(25):
            creator = random.choice(all_employees)
            status = random.choice([TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED])
            
            ticket = Ticket(
                entity_id=entity_id, title=f"Issue {i+1}: {fake.sentence()[:30]}",
                description=fake.paragraph(), category="IT", priority=random.choice(["LOW", "MEDIUM", "HIGH"]),
                status=status, created_by=creator.id, 
                assigned_to=it_mgr.id if status != TicketStatus.OPEN else None
            )
            db.add(ticket)
            db.flush()
            
            db.add(TicketActivity(
                ticket_id=ticket.id, activity_type="CREATED",
                description="Ticket logged by system.", actor_id=creator.id
            ))
        logger.info("✅ 25 Tickets created.")

        # 10. Audit Logs
        logger.info("📜 Generating Audit Logs...")
        for _ in range(40):
            action = random.choice([AuditAction.EMPLOYEE_CREATED, AuditAction.LEAVE_APPROVED, AuditAction.TICKET_CREATED])
            db.add(AuditLog(
                entity_id=entity_id, user_id=ashish_user.id, action=action,
                module="SYSTEM", resource_type="Seed", resource_id=str(uuid.uuid4()),
                ip_address=fake.ipv4(), user_agent="PySeedScript/1.0"
            ))
        
        db.commit()
        
        logger.info("\n" + "="*40)
        logger.info("🚀 Reset & Seed completed successfully!")
        logger.info(f"   Employees:   {len(all_employees)}")
        logger.info(f"   Departments: {len(departments)}")
        logger.info(f"   Tickets:     25")
        logger.info(f"   Leaves:      30")
        logger.info("="*40)
        logger.info(f"   Ashish Admin: {ASHISH_EMAIL} / {SEED_PASSWORD}")
        logger.info("="*40)

    except Exception as e:
        db.rollback()
        logger.error(f"❌ Seed failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_seed()
