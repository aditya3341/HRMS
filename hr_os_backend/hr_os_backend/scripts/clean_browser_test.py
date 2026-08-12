import os
import sys
from dotenv import load_dotenv

backend_dir = r"c:\Users\User\Downloads\HRMS (2)\HRMS\HRMS\hr_os_backend"
sys.path.insert(0, backend_dir)
os.chdir(backend_dir)
load_dotenv()

from app.core.mongodb import connect_mongo

db = connect_mongo()

db.employees.delete_many({"email": "browser_test@zipaworld.com"})
db.users.delete_many({"email": "browser_test@zipaworld.com"})

print("Cleaned up browser_test@zipaworld.com employee and user.")
