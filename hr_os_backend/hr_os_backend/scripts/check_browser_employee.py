import os
import sys
from dotenv import load_dotenv

backend_dir = r"c:\Users\User\Downloads\HRMS (2)\HRMS\HRMS\hr_os_backend"
sys.path.insert(0, backend_dir)
os.chdir(backend_dir)
load_dotenv()

from app.core.mongodb import connect_mongo

db = connect_mongo()

emp = db.employees.find_one({"email": "browser_test@zipaworld.com"})
print("Employee:", emp)

user = db.users.find_one({"email": "browser_test@zipaworld.com"})
print("User:", user)
