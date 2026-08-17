import os
import sys
from dotenv import load_dotenv

backend_dir = r"c:\Users\User\Downloads\HRMS (2)\HRMS\HRMS\hr_os_backend"
sys.path.insert(0, backend_dir)
os.chdir(backend_dir)
load_dotenv()

from app.core.mongodb import connect_mongo

db = connect_mongo()

emp1 = db.employees.find_one({"_id": "1cce8f72-3b49-4290-bdde-ffc16ebfaf9e"})
emp2 = db.employees.find_one({"_id": "74ec8e9e-ca92-4db7-9946-b9ba91b59678"})

print("Employee 1 (created at 10:59:02Z):")
if emp1:
    print(f"  Name: {emp1.get('full_name')}")
    print(f"  Email: {emp1.get('email')}")
    print(f"  Code: {emp1.get('employee_code')}")
    print(f"  user_id: {emp1.get('user_id')}")
else:
    print("  Not found")

print("\nEmployee 2 (created at 10:55:52Z):")
if emp2:
    print(f"  Name: {emp2.get('full_name')}")
    print(f"  Email: {emp2.get('email')}")
    print(f"  Code: {emp2.get('employee_code')}")
    print(f"  user_id: {emp2.get('user_id')}")
else:
    print("  Not found")
