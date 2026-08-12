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

# Delete ambrish@zipaworld.com user
res = db.users.delete_many({"email": "ambrish@zipaworld.com"})
print(f"Deleted {res.deleted_count} user records for ambrish@zipaworld.com.")
