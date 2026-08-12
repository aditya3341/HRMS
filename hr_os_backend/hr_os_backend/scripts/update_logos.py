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

# Update employees collection
res1 = db.employees.update_many(
    {"$or": [
        {"avatar_url": None},
        {"avatar_url": ""},
        {"avatar_url": {"$exists": False}}
    ]},
    {"$set": {"avatar_url": "/zipaworld_logo_light.png"}}
)

res2 = db.employees.update_many(
    {"$or": [
        {"banner_url": None},
        {"banner_url": ""},
        {"banner_url": {"$exists": False}}
    ]},
    {"$set": {"banner_url": "/zipaworld_logo_light.png"}}
)

# Update users collection (if avatar_url is cached there)
res3 = db.users.update_many(
    {"$or": [
        {"avatar_url": None},
        {"avatar_url": ""},
        {"avatar_url": {"$exists": False}}
    ]},
    {"$set": {"avatar_url": "/zipaworld_logo_light.png"}}
)

print(f"Updated {res1.modified_count} employee avatars, {res2.modified_count} employee banners, and {res3.modified_count} user avatars.")
