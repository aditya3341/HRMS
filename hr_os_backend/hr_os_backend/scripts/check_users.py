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
    
    print("\n--- USERS ---")
    users = list(db.users.find({}))
    for u in users:
        print(f"Email: {u.get('email')}, Role: {u.get('role')}, EmpId: {u.get('employee_id')}")

if __name__ == "__main__":
    run()
