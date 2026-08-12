import os
import sys
from uuid import uuid4
from datetime import datetime
from dotenv import load_dotenv

backend_dir = r"c:\Users\User\Downloads\HRMS (2)\HRMS\HRMS\hr_os_backend"
sys.path.insert(0, backend_dir)
os.chdir(backend_dir)
load_dotenv()

from app.core.mongodb import connect_mongo

def _id():
    return str(uuid4())

def run():
    db = connect_mongo()
    print("Database connected:", db.name)

    # Departments
    hr_dept = db.departments.find_one({"name": "HR"})
    it_dept = db.departments.find_one({"name": "IT"})
    
    hr_dept_id = str(hr_dept["_id"]) if hr_dept else None
    it_dept_id = str(it_dept["_id"]) if it_dept else None

    admins = [
        {"email": "admin@zipaworld.com", "name": "Admin User", "role": "SUPER_ADMIN", "designation": "CTO", "dept_id": it_dept_id, "code": "ADM-001"},
        {"email": "hr@zipaworld.com", "name": "HR Manager", "role": "HR_ADMIN", "designation": "HR Head", "dept_id": hr_dept_id, "code": "HRM-001"}
    ]

    for adm in admins:
        user = db.users.find_one({"email": adm["email"]})
        if not user:
            print(f"User {adm['email']} not found in DB.")
            continue

        emp = db.employees.find_one({"email": adm["email"]})
        if not emp:
            emp_id = _id()
            print(f"Creating employee record for {adm['name']} ({adm['email']})")
            db.employees.insert_one({
                "_id": emp_id, "id": emp_id,
                "user_id": str(user["_id"]),
                "entity_id": "Zipaworld",
                "employee_code": adm["code"],
                "full_name": adm["name"],
                "email": adm["email"],
                "designation": adm["designation"],
                "department_id": adm["dept_id"],
                "status": "ACTIVE",
                "date_of_joining": datetime.utcnow(),
                "documents_uploaded": True,
                "policies_accepted": True,
                "phone": "+91-9999900001",
                "address": "Gurugram, India",
                "emergency_contact": "+91-9999900001"
            })
        else:
            emp_id = emp["_id"]
            print(f"Employee record already exists for {adm['name']}: {emp_id}")

        # Update User's employee_id link
        db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"employee_id": emp_id}}
        )
        print(f"Linked user {adm['email']} to employee record {emp_id}")

    print("Admin and HR profiles fixed successfully!")

if __name__ == "__main__":
    run()
