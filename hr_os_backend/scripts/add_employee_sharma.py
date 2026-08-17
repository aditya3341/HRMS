import os
import sys
from dotenv import load_dotenv
import uuid
from datetime import datetime

backend_dir = r"c:\Users\User\Downloads\HRMS (2)\HRMS\HRMS\hr_os_backend"
sys.path.insert(0, backend_dir)
os.chdir(backend_dir)
load_dotenv()

from app.core.mongodb import connect_mongo

db = connect_mongo()

employee_data = {
    "_id": str(uuid.uuid4()),
    "id": str(uuid.uuid4()),
    "entity_id": "Zipaworld",
    "employee_code": "ZW_144",
    "full_name": "sharma ji",
    "first_name": "sharma",
    "last_name": "ji",
    "email": "sharma@zipaworld.com",
    "department_id": "45eca470-bd85-4ebc-9aa9-7ca0333debc8",
    "status": "ACTIVE",
    "date_of_joining": datetime.strptime("2026-07-02", "%Y-%m-%d"),
    "designation": "SMM",
    "manager_id": "6ab73a5c-2fe8-492c-a3e9-9585de7257a9",
    "avatar_url": None,
    "seating_location": "Noida",
    "work_phone": None,
    "extension": "+91",
    "other_email": "dubeyadity1223@gmail.com",
    "birth_date": datetime.strptime("2007-01-01", "%Y-%m-%d"),
    "phone": "8989898989",
    "marital_status": "Single",
    "nick_name": "Sharma",
    "expertise": "sfvfvf",
    "gender": "Male",
    "about_me": "Nsfn",
    "tags": "SMM",
    "role": "EMPLOYEE",
    "employee_type": "Permanent",
    "source_of_hire": "Direct",
    "work_role": "Team member",
    "documents_uploaded": False,
    "policies_accepted": False,
}

# Insert employee
result = db.employees.insert_one(employee_data)
print("Inserted employee, _id:", result.inserted_id)

# Also create corresponding user record (simplified)
user_data = {
    "_id": str(uuid.uuid4()),
    "id": str(uuid.uuid4()),
    "email": "sharma@zipaworld.com",
    "hashed_password": "placeholderhash",
    "password_hash": "placeholderhash",
    "role": "EMPLOYEE",
    "entity_id": "Zipaworld",
    "employee_id": employee_data["_id"],
}
user_result = db.users.insert_one(user_data)
print("Inserted user, _id:", user_result.inserted_id)
