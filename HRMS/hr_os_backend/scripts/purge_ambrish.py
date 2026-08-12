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

# Purge any employees matching the code or email variations
res1 = db.employees.delete_many({
    "$or": [
        {"employee_code": " ZW_012"},
        {"employee_code": "ZW_012"},
        {"email": "ceo@zipaworld.com"},
        {"email": "ambrish@zipaworld.com"}
    ]
})

# Purge any users matching the email variations
res2 = db.users.delete_many({
    "$or": [
        {"email": "ceo@zipaworld.com"},
        {"email": "ambrish@zipaworld.com"}
    ]
})

print(f"Purged {res1.deleted_count} employee records and {res2.deleted_count} user records.")
