import os
import sys
import traceback
from dotenv import load_dotenv

backend_dir = r"c:\Users\User\Downloads\HRMS (2)\HRMS\HRMS\hr_os_backend"
sys.path.insert(0, backend_dir)
os.chdir(backend_dir)
load_dotenv()

from app.api.employees import create_employee_direct, EmployeeCreate
from app.core.mongodb import connect_mongo

db = connect_mongo()
print("Connected to database:", db.name)

# Mock EmployeeCreate payload
payload = EmployeeCreate(
    full_name="Test Direct Employee",
    email="test_direct_emp@zipaworld.com",
    role="EMPLOYEE",
    department_id="e8967b47-74e7-4e3c-865a-1df998ad64d4",
    employee_code="TEST-DIR-101",
    designation="Tester",
    phone="9999900000",
    marital_status="Single",
    gender="Male"
)

# Mock current user context
current_user = {
    "user_id": "93afe38f-8c74-4e32-ae4d-682a463cbe8f",
    "email": "admin@zipaworld.com",
    "role": "SUPER_ADMIN",
    "entity_id": "Zipaworld"
}

# Clean any existing test document first
db.employees.delete_many({"email": "test_direct_emp@zipaworld.com"})
db.users.delete_many({"email": "test_direct_emp@zipaworld.com"})

try:
    print("Calling create_employee_direct...")
    res = create_employee_direct(payload=payload, current_user=current_user)
    print("Success response:", res)
except Exception as e:
    print("EXCEPTION THROWN:")
    print(e)
    traceback.print_exc()
finally:
    # Cleanup
    db.employees.delete_many({"email": "test_direct_emp@zipaworld.com"})
    db.users.delete_many({"email": "test_direct_emp@zipaworld.com"})
