import os
import sys
from dotenv import load_dotenv

backend_dir = r"c:\Users\User\Downloads\HRMS (2)\HRMS\HRMS\hr_os_backend"
sys.path.insert(0, backend_dir)
os.chdir(backend_dir)
load_dotenv()

from app.core.mongodb import connect_mongo

db = connect_mongo()

email = "sharma@zipaworld.com"
# Find employee and user
emp = db.employees.find_one({"email": email})
user = db.users.find_one({"email": email})

if emp:
    db.employees.delete_one({"_id": emp["_id"]})
    print(f"Deleted employee with email {email}")
else:
    print(f"No employee found with email {email}")

if user:
    db.users.delete_one({"_id": user["_id"]})
    print(f"Deleted user with email {email}")
else:
    print(f"No user found with email {email}")
