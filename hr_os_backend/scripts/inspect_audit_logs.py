import os
import sys
from dotenv import load_dotenv

backend_dir = r"c:\Users\User\Downloads\HRMS (2)\HRMS\HRMS\hr_os_backend"
sys.path.insert(0, backend_dir)
os.chdir(backend_dir)
load_dotenv()

from app.core.mongodb import connect_mongo

db = connect_mongo()
print("Connected to database:", db.name)

print("\n--- Recent Audit Logs ---")
logs = list(db.audit_logs.find({}).sort("timestamp", -1).limit(10))
for log in logs:
    print(f"Time: {log.get('timestamp')} | Action: {log.get('action')} | User: {log.get('user_id')} | Resource: {log.get('resource_id')}")
