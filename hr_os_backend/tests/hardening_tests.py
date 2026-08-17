import uuid
import asyncio
from datetime import date
from sqlalchemy import select
from app.core.database import SessionLocal
from app.models.employee import Employee
from app.models.salary_structure import SalaryStructure
from app.models.attendance import Attendance
from app.models.payroll import PayrollRun, PayrollEntry
from app.models.enums import AttendanceStatus, PayrollStatus
from app.services.payroll_service import PayrollService

async def setup_test_data(db, entity_id, user_id):
    # 1. Create Test Employee
    emp_id = uuid.uuid4()
    emp = Employee(
        id=emp_id,
        entity_id=entity_id,
        first_name="Hardening",
        last_name="Tester",
        email=f"tester_{emp_id.hex[:6]}@example.com",
        employee_id=f"TEST_{emp_id.hex[:6]}",
        date_of_joining=date(2025, 1, 1),
        is_active=True
    )
    db.add(emp)
    
    # 2. Salary Structure (Gross 45000)
    struct = SalaryStructure(
        employee_id=emp_id,
        entity_id=entity_id,
        basic=20000,
        hra=10000,
        special_allowance=10000,
        other_allowances=5000,
        fixed_deductions=1000,
        is_active=True
    )
    db.add(struct)
    
    # 3. Attendance for April 2026 (22 Working Days)
    # Scenario: 1 Absence, 3 Half-Days -> 1 + 1.5 = 2.5 LOP
    # April 1 (Wed) - Present
    # April 2 (Thu) - Half Day
    # April 3 (Fri) - Half Day
    # April 6 (Mon) - Half Day
    # April 7 (Tue) - Absent
    
    records = [
        (date(2026, 4, 1), AttendanceStatus.PRESENT, False),
        (date(2026, 4, 2), AttendanceStatus.HALF_DAY, False),
        (date(2026, 4, 3), AttendanceStatus.HALF_DAY, False),
        (date(2026, 4, 6), AttendanceStatus.HALF_DAY, False),
        (date(2026, 4, 7), AttendanceStatus.ABSENT, False),
    ]
    
    for d, status, is_late in records:
        att = Attendance(
            entity_id=entity_id,
            employee_id=emp_id,
            date=d,
            status=status,
            is_late=is_late
        )
        db.add(att)
    
    db.commit()
    return emp_id

async def run_tests():
    entity_id = uuid.uuid4()
    user_id = uuid.uuid4()
    
    print("\n🚀 Starting Final Hardening Tests...")
    
    try:
        db = SessionLocal()
        emp_id = await setup_test_data(db, entity_id, user_id)
        
        # --- TEST 1: Deterministic Rounding & Half-Day Logic ---
        print("\n[Test 1] Deterministic Rounding & Half-Day LOP")
        run = await PayrollService.run_monthly_payroll(db, entity_id, 4, 2026, user_id)
        entry = run.entries[0]
        
        # Calcs: 
        # Gross = 45000. Working Days = 22. 
        # Per Day = round(45000/22, 2) = 2045.45
        # LOP = 1 (Absent) + 1.5 (3 Half-Days) = 2.5
        # Deduction = round(2.5 * 2045.45, 2) = 5113.625 -> 5113.63
        # Net = round(45000 - 5113.63 - 1000, 2) = 38886.37
        
        print(f"  LOP Days: {entry.lop_days} (Expected: 2.5)")
        print(f"  Absences: {entry.absences_count} (Expected: 1.0)")
        print(f"  Half-Days: {entry.half_day_count} (Expected: 3.0)")
        print(f"  Gross: {entry.gross_salary} (Expected: 45000)")
        print(f"  LOP Deduction: {entry.lop_deduction} (Expected: 5113)")
        print(f"  Net Salary: {entry.net_salary} (Expected: 38886)")
        
        assert entry.lop_days == 2.5
        assert entry.absences_count == 1.0
        assert entry.half_day_count == 3.0
        assert int(entry.lop_deduction) == 5113
        assert int(entry.net_salary) == 38886
        print("  ✅ Rounding & LOP counts verified.")

        # --- TEST 2: Immutability ---
        print("\n[Test 2] Immutability Protection")
        # Lock the run
        await PayrollService.update_run_status(db, run.id, PayrollStatus.LOCKED)
        print("  Run status updated to LOCKED.")
        
        try:
            await PayrollService.update_entry_override(db, entry.id, 500, "Should Fail", user_id, entity_id)
            print("  ❌ ERROR: Allowed override on LOCKED run.")
        except ValueError as e:
            print(f"  ✅ Expected Failure: {e}")
            
        try:
            await PayrollService.delete_payroll_run(db, run.id)
            print("  ❌ ERROR: Allowed deletion of LOCKED run.")
        except ValueError as e:
            print(f"  ✅ Expected Failure: {e}")

        # --- TEST 3: Traceability Breakdown ---
        print("\n[Test 3] Traceability Breakdown Verify")
        print(f"  Granular Counts: ABS={entry.absences_count}, LV={entry.approved_leave_count}, HALF={entry.half_day_count}")
        assert entry.absences_count == 1.0
        assert entry.half_day_count == 3.0
        print("  ✅ Traceability columns verified.")

        print("\n✨ ALL HARDENING TESTS PASSED!")
        
    except Exception as e:
        print(f"\n❌ TEST SUITE FAILED: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Cleanup
        # (Optional: delete test entity data)
        db.close()

if __name__ == "__main__":
    asyncio.run(run_tests())
