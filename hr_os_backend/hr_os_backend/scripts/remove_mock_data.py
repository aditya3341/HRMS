import os
import sys
from dotenv import load_dotenv

# Load env from backend
backend_dir = r"c:\Users\User\Downloads\HRMS (2)\HRMS\HRMS\hr_os_backend"
sys.path.insert(0, backend_dir)
os.chdir(backend_dir)
load_dotenv()

from app.core.mongodb import connect_mongo

def run():
    db = connect_mongo()
    print("Connected to database:", db.name)

    # 1. Identify mock employee IDs (those starting with ZIPA-)
    mock_employees = list(db.employees.find({"employee_code": {"$regex": "^ZIPA-"}}))
    mock_ids = [emp["_id"] for emp in mock_employees]
    mock_emails = [emp.get("email") for emp in mock_employees if emp.get("email")]
    print(f"Found {len(mock_ids)} mock employees starting with 'ZIPA-'")

    # We want to preserve admin@zipaworld.com as SuperAdmin user, but unlink it from any deleted employee
    preserve_emails = {"admin@zipaworld.com", "admin@aaa2.com"}

    # 2. Delete mock employees
    if mock_ids:
        res = db.employees.delete_many({"_id": {"$in": mock_ids}})
        print(f"Deleted {res.deleted_count} mock employees.")
    
    # 3. Delete mock users (except preserved ones)
    user_delete_query = {
        "$or": [
            {"employee_id": {"$in": mock_ids}},
            {"email": {"$in": mock_emails}}
        ],
        "email": {"$nin": list(preserve_emails)}
    }
    res_users = db.users.delete_many(user_delete_query)
    print(f"Deleted {res_users.deleted_count} mock users.")

    # Reset any remaining preserved users to not reference mock employees
    db.users.update_many(
        {"email": {"$in": list(preserve_emails)}},
        {"$set": {"employee_id": None}}
    )
    print("Preserved admin users unlinked from mock employees.")

    # 4. Clean up other collections for mock employees
    if mock_ids:
        # Attendance
        res = db.attendance.delete_many({"employee_id": {"$in": mock_ids}})
        print(f"Deleted {res.deleted_count} attendance records.")
        # Biometric logs
        res = db.biometric_logs.delete_many({"employee_id": {"$in": mock_ids}})
        print(f"Deleted {res.deleted_count} biometric logs.")
        # Leave balances
        res = db.leave_balances.delete_many({"employee_id": {"$in": mock_ids}})
        print(f"Deleted {res.deleted_count} leave balances.")
        # Salary structures
        res = db.salary_structures.delete_many({"employee_id": {"$in": mock_ids}})
        print(f"Deleted {res.deleted_count} salary structures.")
        # Leave requests
        res = db.leave_requests.delete_many({"employee_id": {"$in": mock_ids}})
        print(f"Deleted {res.deleted_count} leave requests.")

    # 5. Clear Team Bridge messages & attachments
    res = db.teambridge_messages.delete_many({})
    print(f"Cleared {res.deleted_count} teambridge messages.")
    res = db.teambridge_attachments.delete_many({})
    print(f"Cleared {res.deleted_count} teambridge attachments.")

    # 6. Clear other mock data seeded by seed_mongo
    # Mock Jobs & Applications
    res = db.jobs.delete_many({})
    print(f"Deleted {res.deleted_count} mock jobs.")
    res = db.applications.delete_many({})
    print(f"Deleted {res.deleted_count} mock applications.")
    
    print("Cleanup complete!")

if __name__ == "__main__":
    run()
