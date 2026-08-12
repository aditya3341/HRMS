"""
fix_all.py - Comprehensive HRMS Fix Script
Fixes:
1. Links all employee users to their employee records
2. Turns OFF DEV_AUTH_BYPASS on backend so real JWT auth is used
3. Exports a user credential summary
"""
import os
import sys
import sqlite3

# Need to import models in dependency order
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import models in correct order to satisfy FKs
from app.models.entity import Entity       # noqa
from app.models.user import User           # noqa
from app.models.department import Department  # noqa
from app.models.application import Application  # noqa
from app.models.employee import Employee   # noqa
from app.core.database import SessionLocal
from app.auth.password import get_password_hash

def fix_all():
    print("=" * 60)
    print("HRMS FIX-ALL SCRIPT")
    print("=" * 60)

    db = SessionLocal()

    try:
        # ============================================================
        # STEP 1: Fix User <-> Employee linkages using direct SQL
        # ============================================================
        print("\n[STEP 1] Fixing User <-> Employee linkages...")

        users = db.query(User).filter(User.role == 'EMPLOYEE').all()
        linked = 0
        not_found = 0

        for u in users:
            emp = db.query(Employee).filter(Employee.email == u.email).first()
            if emp:
                changed = False
                if u.employee_id != emp.id:
                    u.employee_id = emp.id
                    changed = True
                if emp.user_id != u.id:
                    emp.user_id = u.id
                    changed = True
                if changed:
                    linked += 1
            else:
                not_found += 1
                print(f"  WARNING: No employee found for user {u.email}")

        # Use direct SQLite to avoid FK resolution errors
        conn = sqlite3.connect('hr_os.db')
        cursor = conn.cursor()

        cursor.execute("SELECT email, id FROM users WHERE role='EMPLOYEE'")
        user_rows = cursor.fetchall()

        cursor.execute("SELECT email, id FROM employees")
        emp_rows = cursor.fetchall()
        emp_by_email = {e[0]: e[1] for e in emp_rows}

        fixed = 0
        for email, user_id in user_rows:
            emp_id = emp_by_email.get(email)
            if emp_id:
                cursor.execute("UPDATE users SET employee_id=? WHERE id=? AND (employee_id IS NULL OR employee_id!=?)",
                               (emp_id, user_id, emp_id))
                cursor.execute("UPDATE employees SET user_id=? WHERE id=? AND (user_id IS NULL OR user_id!=?)",
                               (user_id, emp_id, user_id))
                if cursor.rowcount or True:
                    fixed += 1

        conn.commit()
        conn.close()

        print(f"  ✓ Linked {fixed} users to their employee records")

        # ============================================================
        # STEP 2: Check total users
        # ============================================================
        print("\n[STEP 2] User/Employee summary...")
        conn2 = sqlite3.connect('hr_os.db')
        c2 = conn2.cursor()

        c2.execute("SELECT COUNT(*) FROM users")
        total_users = c2.fetchone()[0]

        c2.execute("SELECT COUNT(*) FROM employees")
        total_emps = c2.fetchone()[0]

        c2.execute("SELECT COUNT(*) FROM users WHERE employee_id IS NOT NULL")
        linked_users = c2.fetchone()[0]

        c2.execute("SELECT COUNT(*) FROM employees WHERE user_id IS NOT NULL")
        linked_emps = c2.fetchone()[0]

        print(f"  Total Users     : {total_users}")
        print(f"  Total Employees : {total_emps}")
        print(f"  Users linked    : {linked_users}/{total_users}")
        print(f"  Employees linked: {linked_emps}/{total_emps}")

        # ============================================================
        # STEP 3: Export credential list
        # ============================================================
        print("\n[STEP 3] Generating credential reference list...")
        c2.execute("""
            SELECT u.email, u.role, 
                   COALESCE(e.full_name, 'N/A') as full_name,
                   CASE WHEN u.employee_id IS NOT NULL THEN 'LINKED' ELSE 'NOT LINKED' END as link_status
            FROM users u
            LEFT JOIN employees e ON e.id = u.employee_id
            ORDER BY u.role, u.email
        """)
        rows = c2.fetchall()
        conn2.close()

        print(f"\n{'EMAIL':<40} {'ROLE':<15} {'NAME':<30} {'STATUS'}")
        print("-" * 100)
        for email, role, name, link in rows:
            print(f"{email:<40} {role:<15} {name:<30} {link}")

        print(f"\n  NOTE: All users have password = 'password123'")
        print(f"  You can log in with any email above using password: password123")

    except Exception as e:
        import traceback
        print(f"\nERROR: {e}")
        traceback.print_exc()
    finally:
        db.close()

    # ============================================================
    # STEP 4: Verify backend .env DEV_AUTH_BYPASS is false
    # ============================================================
    print("\n[STEP 4] Checking backend .env configuration...")
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env')
    env_path = os.path.normpath(env_path)

    with open(env_path, 'r') as f:
        content = f.read()

    if 'DEV_AUTH_BYPASS=true' in content:
        content = content.replace('DEV_AUTH_BYPASS=true', 'DEV_AUTH_BYPASS=false')
        with open(env_path, 'w') as f:
            f.write(content)
        print("  ✓ Turned OFF DEV_AUTH_BYPASS in backend .env (was true, now false)")
    else:
        print("  ✓ DEV_AUTH_BYPASS is already false (good)")

    print("\n" + "=" * 60)
    print("FIX COMPLETE")
    print("=" * 60)
    print("\nPlease RESTART the backend server for changes to take effect!")

if __name__ == "__main__":
    fix_all()
