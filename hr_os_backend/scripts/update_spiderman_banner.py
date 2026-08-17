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

# Update employees collection banner_url to /default_banner.jpg if it matches the old default or is not customized
res1 = db.employees.update_many(
    {"$or": [
        {"banner_url": "/zipaworld_logo_light.png"},
        {"banner_url": None},
        {"banner_url": ""},
        {"banner_url": {"$exists": False}}
    ]},
    {"$set": {"banner_url": "/default_banner.jpg"}}
)

print(f"Updated {res1.modified_count} employee banners to default Spider-man banner.")
