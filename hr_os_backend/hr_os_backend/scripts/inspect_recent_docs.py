import os
import sys
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

backend_dir = r"c:\Users\User\Downloads\HRMS (2)\HRMS\HRMS\hr_os_backend"
sys.path.insert(0, backend_dir)
os.chdir(backend_dir)
load_dotenv()

from app.core.mongodb import connect_mongo

db = connect_mongo()

print("\n--- Recent Employees ---")
emps = list(db.employees.find({}).sort("_id", -1))
for emp in emps:
    print(f"ID: {emp.get('_id')} | Name: {emp.get('full_name')} | Email: {emp.get('email')} | Code: repr({repr(emp.get('employee_code'))})")

print("\n--- Recent Users ---")
users = list(db.users.find({}).sort("_id", -1))
for u in users:
    print(f"ID: {u.get('_id')} | Email: {u.get('email')} | Role: {u.get('role')} | EmpID: {u.get('employee_id')}")
