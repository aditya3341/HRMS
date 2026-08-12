import os
import sys
from dotenv import load_dotenv

backend_dir = r"c:\Users\User\Downloads\HRMS (2)\HRMS\HRMS\hr_os_backend"
sys.path.insert(0, backend_dir)
os.chdir(backend_dir)
load_dotenv()

from app.core.mongodb import connect_mongo
from app.auth.password import get_password_hash

db = connect_mongo()
print("Connected to database:", db.name)

# Reset password for admin@zipaworld.com
hashed = get_password_hash("password123")
res = db.users.update_many(
    {"email": "admin@zipaworld.com"},
    {"$set": {
        "hashed_password": hashed,
        "password_hash": hashed
    }}
)
print(f"Updated {res.modified_count} users matching admin@zipaworld.com.")
