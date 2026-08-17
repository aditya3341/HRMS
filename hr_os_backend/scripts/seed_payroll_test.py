import uuid
from datetime import datetime, date, timedelta
from app.core.database import SessionLocal
# Import all models to populate Base.metadata
from app.models.entity import Entity
from app.models.application import Application
from app.models.user import User
from app.models.department import Department
from app.models.employee import Employee
from app.models.leave import LeaveType, LeaveBalance, Leave
from app.models.audit_log import AuditLog
from app.models.ticket import Ticket
from app.models.attendance import Attendance
from app.models.payroll import EmployeeSalary, Payroll, PayrollItem
from app.models.enums import AttendanceStatus

def seed_payroll_test_data():
    db = SessionLocal()
    try:
        # 1. Get or Create Entity & Application
        entity = db.query(Entity).first()
        if not entity:
            entity = Entity(name="Test Corp", domain="test.com")
            db.add(entity)
            db.flush()
        
        app = db.query(Application).first()
        if not app:
            app = Application(name="Payroll Test App", entity_id=entity.id)
            db.add(app)
            db.flush()

        # 2. Create Test Employee
        emp_email = "payroll.test@zipaworld.com"
        emp = db.query(Employee).filter(Employee.email == emp_email).first()
        if not emp:
            emp = Employee(
                full_name="Payroll Test User",
                email=emp_email,
                employee_code="PY-001",
                entity_id=entity.id,
                application_id=app.id,
                status="ACTIVE"
            )
            db.add(emp)
            db.flush()
            print(f"Created Employee: {emp.full_name}")

        # 3. Create Salary Structure
        salary = db.query(EmployeeSalary).filter(EmployeeSalary.employee_id == emp.id).first()
        if not salary:
            salary = EmployeeSalary(
                employee_id=emp.id,
                entity_id=entity.id,
                ctc=600000,
                basic=25000,
                hra=10000,
                allowances=5000,
                bonus=0,
                pf_employee=3000,
                pf_employer=3000,
                esi=0,
                professional_tax=200
            )
            db.add(salary)
            print(f"Created Salary Structure for {emp.full_name}")

        # 4. Create Attendance Data for Current Month
        today = date.today()
        month_start = date(today.year, today.month, 1)
        
        # Add 20 days of PRESENT
        for i in range(20):
            d = month_start + timedelta(days=i)
            if not db.query(Attendance).filter(Attendance.employee_id == emp.id, Attendance.date == d).first():
                att = Attendance(
                    employee_id=emp.id,
                    entity_id=entity.id,
                    date=d,
                    status=AttendanceStatus.PRESENT,
                    check_in=datetime.combine(d, datetime.min.time().replace(hour=9)),
                    check_out=datetime.combine(d, datetime.min.time().replace(hour=18)),
                    total_hours=9.0
                )
                db.add(att)

        # Add 2 days of ABSENT
        for i in range(20, 22):
            d = month_start + timedelta(days=i)
            if not db.query(Attendance).filter(Attendance.employee_id == emp.id, Attendance.date == d).first():
                att = Attendance(
                    employee_id=emp.id,
                    entity_id=entity.id,
                    date=d,
                    status=AttendanceStatus.ABSENT,
                    total_hours=0.0
                )
                db.add(att)

        # Add 2 days of HALF_DAY
        for i in range(22, 24):
            d = month_start + timedelta(days=i)
            if not db.query(Attendance).filter(Attendance.employee_id == emp.id, Attendance.date == d).first():
                att = Attendance(
                    employee_id=emp.id,
                    entity_id=entity.id,
                    date=d,
                    status=AttendanceStatus.HALF_DAY,
                    check_in=datetime.combine(d, datetime.min.time().replace(hour=9)),
                    check_out=datetime.combine(d, datetime.min.time().replace(hour=13)),
                    total_hours=4.0
                )
                db.add(att)

        db.commit()
        print("Seed data completed successfully.")

    finally:
        db.close()

if __name__ == "__main__":
    seed_payroll_test_data()
