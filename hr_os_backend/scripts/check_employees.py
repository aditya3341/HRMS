import os
import sys
from dotenv import load_dotenv

backend_dir = r"c:\Users\User\Downloads\HRMS (2)\HRMS\HRMS\hr_os_backend"
sys.path.insert(0, backend_dir)
os.chdir(backend_dir)
load_dotenv()

from app.core.mongodb import connect_mongo

def run():
    db = connect_mongo()
    print("Database:", db.name)
    
    print("\n--- DEPARTMENTS ---")
    depts = list(db.departments.find({}))
    dept_map = {str(d["_id"]): d["name"] for d in depts}
    for d in depts:
        print(f"ID: {d['_id']}, Name: {d['name']}")
        
    print("\n--- EMPLOYEES ---")
    employees = list(db.employees.find({}))
    print(f"Total employees: {len(employees)}")
    for emp in employees:
        dept_name = dept_map.get(str(emp.get("department_id")), "Unknown")
        print(f"Code: {emp.get('employee_code')}, Name: {emp.get('full_name')}, Email: {emp.get('email')}, Dept: {dept_name}, Desig: {emp.get('designation')}")

if __name__ == "__main__":
    run()
