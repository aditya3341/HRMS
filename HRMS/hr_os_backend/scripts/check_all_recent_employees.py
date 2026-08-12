import os
import sys
from dotenv import load_dotenv

backend_dir = r"c:\Users\User\Downloads\HRMS (2)\HRMS\HRMS\hr_os_backend"
sys.path.insert(0, backend_dir)
os.chdir(backend_dir)
load_dotenv()

from app.core.mongodb import connect_mongo

db = connect_mongo()

print("\n--- Recent Employees (Last 30m) ---")
res = list(db.employees.find({}).sort("_id", -1).limit(5))
for r in res:
    print(f"ID: {r.get('_id')} | Name: {r.get('full_name')} | Email: {r.get('email')} | Code: {repr(r.get('employee_code'))} | Status: {r.get('status')}")
