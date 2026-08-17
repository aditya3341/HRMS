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

# Search recent employees
emp1 = db.employees.find_one({"_id": "1cce8f72-3b49-4290-bdde-ffc16ebfaf9e"})
emp2 = db.employees.find_one({"_id": "74ec8e9e-ca92-4db7-9946-b9ba91b59678"})

print("\nEmployee 1:")
print(emp1)

print("\nEmployee 2:")
print(emp2)
