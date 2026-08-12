import os
import sys
from dotenv import load_dotenv

backend_dir = r"c:\Users\User\Downloads\HRMS (2)\HRMS\HRMS\hr_os_backend"
sys.path.insert(0, backend_dir)
os.chdir(backend_dir)
load_dotenv()

from app.core.mongodb import connect_mongo

db = connect_mongo()

for name in ["Dr. Ambrish", "subham"]:
    res = list(db.employees.find({"full_name": {"$regex": name, "$options": "i"}}))
    print(f"\nMatching '{name}':")
    for r in res:
        print(f"  _id: {r.get('_id')} | Name: {r.get('full_name')} | Email: {r.get('email')} | Code: {r.get('employee_code')} | UserID: {r.get('user_id')}")
