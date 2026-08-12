import os
import sys
from datetime import datetime, timedelta
from uuid import uuid4
from dotenv import load_dotenv

backend_dir = r"c:\Users\User\Downloads\HRMS (2)\HRMS\HRMS\hr_os_backend"
sys.path.insert(0, backend_dir)
os.chdir(backend_dir)
load_dotenv()

from app.core.mongodb import connect_mongo
from app.auth.password import get_password_hash

def _id():
    return str(uuid4())

def run():
    db = connect_mongo()
    print("Database connected:", db.name)

    # 1. Load departments and construct a map
    depts = list(db.departments.find({}))
    dept_map = {d["name"]: str(d["_id"]) for d in depts}
    print("Loaded departments:", list(dept_map.keys()))

    # Verify all expected departments exist
    expected_depts = ["Social Media Management", "Sales", "Operation", "Management", "IT"]
    for ed in expected_depts:
        if ed not in dept_map:
            # Create department if missing
            did = _id()
            db.departments.insert_one({
                "_id": did, "id": did,
                "name": ed,
                "entity_id": "Zipaworld",
                "created_at": datetime.utcnow(),
            })
            dept_map[ed] = did
            print(f"Created missing department: {ed}")

    # 2. Define the exact 34 employees from the screenshots
    target_employees = [
        # --- Social Media Management ---
        {"code": "ZW_079", "name": "Nandini", "email": "nandini@zipaworld.com", "designation": "SMM Specialist", "dept": "Social Media Management"},
        {"code": "ZW_081", "name": "Nandika", "email": "nandika@zipaworld.com", "designation": "Content and Community Executive", "dept": "Social Media Management"},

        # --- Sales ---
        {"code": "ZW_008", "name": "Rohit", "email": "rohit@zipaworld.com", "designation": "Director", "dept": "Sales"},
        {"code": "ZW_045", "name": "Swati", "email": "swati1@zipaworld.com", "designation": "Assistant Manager - Sales", "dept": "Sales"},
        {"code": "SWZP0011", "name": "Raj Kumar", "email": "sales@zipaworld.com", "designation": "Manager EDI & Operations", "dept": "Sales"},
        {"code": "SWZP0025", "name": "Durga", "email": "sales1@zipaworld.com", "designation": "Sales Executive", "dept": "Sales"},
        {"code": "ZW_078", "name": "Bhanu", "email": "bhanu@zipaworld.com", "designation": "Business Development Manager", "dept": "Sales"},

        # --- Operation ---
        {"code": "ZW_040", "name": "Jeewan", "email": "delops1@zipaworld.com", "designation": "Assistant Manager (Domestic)", "dept": "Operation"},
        {"code": "ZW_061", "name": "Shikha", "email": "shikha@zipaworld.com", "designation": "Deputy Manager Pricing", "dept": "Operation"},
        {"code": "SWZP0005", "name": "Gagan", "email": "gagan@zipaworld.com", "designation": "Sr. Operation Executive", "dept": "Operation"},
        {"code": "ZW_080", "name": "Rashid", "email": "rashid@zipaworld.com", "designation": "Sr. Executive - Air export Pricing", "dept": "Operation"},

        # --- Management ---
        {"code": "ZW_012", "name": "Dr Ambrish", "email": "ambrish@zipaworld.com", "designation": "Founder & CEO", "dept": "Management"},

        # --- IT ---
        {"code": "AAA2_215", "name": "Sanjeev", "email": "sanjeev@aaa2innovate.com", "designation": "Assistant Manager - IT", "dept": "IT"},
        {"code": "AAA2_235", "name": "Devyanshi", "email": "devyanshi@aaa2innovate.com", "designation": "Software Tester", "dept": "IT"},
        {"code": "AAA2_208", "name": "Kanchan", "email": "kanchan@aaa2innovate.com", "designation": "Software Developer", "dept": "IT"},
        {"code": "AAA2_254", "name": "Amulya Kumar", "email": "amulya@aaa2innovate.com", "designation": "Software Developer", "dept": "IT"},
        {"code": "AAA2_258", "name": "Ankit", "email": "ankit@aaa2innovate.com", "designation": "Software Developer", "dept": "IT"},
        {"code": "AAA2_255", "name": "Anas", "email": "anas@aaa2innovate.com", "designation": "Software Developer", "dept": "IT"},
        {"code": "AAA2_257", "name": "Hammad", "email": "hammad@aaa2innovate.com", "designation": "Software Developer", "dept": "IT"},
        {"code": "AAA2_260", "name": "Dushyant", "email": "dushyant@aaa2innovate.com", "designation": "Software Tester", "dept": "IT"},
        {"code": "AAA2_263", "name": "Bhavya", "email": "bhavya@aaa2innovate.com", "designation": "UI/UX Developer", "dept": "IT"},
        {"code": "AAA2_264", "name": "Alok", "email": "alok@aaa2innovate.com", "designation": "Software Tester", "dept": "IT"},
        {"code": "ZW_073", "name": "Ashish", "email": "ashish@zipaworld.com", "designation": "Manager - Data Operations & Analytics", "dept": "IT"},
        {"code": "ZW_071", "name": "Saman", "email": "saman@zipaworld.com", "designation": "Associate - Graphic Designer", "dept": "IT"},
        {"code": "AAA2_265", "name": "Akash", "email": "akash@aaa2innovate.com", "designation": "Lead Backend Developer", "dept": "IT"},
        {"code": "AAA2_266", "name": "Vivek", "email": "vivek@aaa2innovate.com", "designation": "Flutter Developer", "dept": "IT"},
        {"code": "AAA2_268", "name": "Shoaib", "email": "shoaib@aaa2innovate.com", "designation": "Software Developer", "dept": "IT"},
        {"code": "AAA2_270", "name": "Abhishek", "email": "abhishek@aaa2innovate.com", "designation": "Software Developer", "dept": "IT"},
        {"code": "AAA2_269", "name": "Aftab", "email": "aftab@aaa2innovate.com", "designation": "Software Developer", "dept": "IT"},
        {"code": "AAA2_267", "name": "Sachin", "email": "sachin@aaa2innovate.com", "designation": "Flutter Developer", "dept": "IT"},
        {"code": "AAA2_272", "name": "Kartik", "email": "kartik@aaa2innovate.com", "designation": "Backend Developer", "dept": "IT"},
        {"code": "AAA2_273", "name": "Sahil", "email": "sahil@aaa2innovate.com", "designation": "Data Scientist", "dept": "IT"},
        {"code": "AAA2_275", "name": "Ankit", "email": "ankit1@aaa2innovate.com", "designation": "IOT Developer", "dept": "IT"},
        {"code": "AAA2_274", "name": "Aditya Dhar Dubey", "email": "aditya.dubey@aaa2innovate.com", "designation": "Devops Engineer", "dept": "IT"}
    ]

    # Map target email to existing employee email in db
    matching_map = {
        "nandika@zipaworld.com": "nandikazipa@outlook.com",
        "rohit@zipaworld.com": "rohit.sharma@zipaworld.com",
        "swati1@zipaworld.com": "swati.chaurasia@zipaworld.com",
        "sales@zipaworld.com": "raj.kumar@zipaworld.com",
        "sales1@zipaworld.com": "durga@zipaworld.com",
        "bhanu@zipaworld.com": "bhanuzipa@outlook.com",
        "delops1@zipaworld.com": "jeevan@zipaworld.com",
        "shikha@zipaworld.com": "sikha@zipaworld.com",
        "gagan@zipaworld.com": "gagan@zipaworld.com",
        "rashid@zipaworld.com": "rashidzipa@outlook.com",
        "sanjeev@aaa2innovate.com": "sanjeev.kumar@zipaworld.com",
        "devyanshi@aaa2innovate.com": "divyanshi@zipaworld.com",
        "kanchan@aaa2innovate.com": "kanchan.bisht@zipaworld.com",
        "amulya@aaa2innovate.com": "amulyazipa@outlook.com",
        "ankit@aaa2innovate.com": "ankit@zipaworld.com",
        "anas@aaa2innovate.com": "anas@zipaworld.com",
        "hammad@aaa2innovate.com": "hammad.javed@zipaworld.com",
        "dushyant@aaa2innovate.com": "dushyant@zipaworld.com",
        "bhavya@aaa2innovate.com": "bhavya@zipaworld.com",
        "alok@aaa2innovate.com": "alok@zipaworld.com",
        "saman@zipaworld.com": "saman.khan@zipaworld.com",
        "akash@aaa2innovate.com": "akash.jain@zipaworld.com",
        "vivek@aaa2innovate.com": "vivek@zipaworld.com",
        "shoaib@aaa2innovate.com": "shoaibzipa@outlook.com",
        "abhishek@aaa2innovate.com": "abhishekzipa@outlook.com",
        "aftab@aaa2innovate.com": "aftabzipa@outlook.com",
        "sachin@aaa2innovate.com": "sachin@zipaworld.com",
        "kartik@aaa2innovate.com": "kartikzipa@outlook.com",
        "sahil@aaa2innovate.com": "sahilzipa@outlook.com",
        "aditya.dubey@aaa2innovate.com": "adityazipa@outlook.com"
    }

    # Set of emails to preserve (administrative and system users)
    preserve_emails = {"admin@zipaworld.com", "admin@aaa2.com", "hr@zipaworld.com"}

    # Track processed employee IDs to identify mock/imposter ones later
    processed_employee_ids = set()
    processed_emails = set()

    # Pre-hash default password "password123"
    hashed_password = get_password_hash("password123")

    print("\n--- Feeding / Mapping Employees ---")
    for item in target_employees:
        target_email = item["email"]
        db_email_to_lookup = matching_map.get(target_email, target_email)

        # Lookup employee in DB by target email or mapped old email
        existing_emp = db.employees.find_one({
            "$or": [
                {"email": target_email},
                {"email": db_email_to_lookup}
            ]
        })

        dept_id = dept_map[item["dept"]]

        if existing_emp:
            eid = existing_emp["_id"]
            print(f"Updating existing employee: {existing_emp['full_name']} ({existing_emp['email']}) -> {item['name']} ({target_email})")
            db.employees.update_one(
                {"_id": eid},
                {"$set": {
                    "full_name": item["name"],
                    "email": target_email,
                    "employee_code": item["code"],
                    "designation": item["designation"],
                    "department_id": dept_id,
                    "status": "ACTIVE"
                }}
            )
            # Update corresponding user document if exists
            db.users.update_one(
                {"employee_id": eid},
                {"$set": {
                    "email": target_email
                }}
            )
        else:
            # Create new employee & user
            eid = _id()
            uid = _id()
            print(f"Creating new employee: {item['name']} ({target_email})")
            
            db.employees.insert_one({
                "_id": eid, "id": eid,
                "user_id": uid,
                "entity_id": "Zipaworld",
                "employee_code": item["code"],
                "full_name": item["name"],
                "email": target_email,
                "designation": item["designation"],
                "department_id": dept_id,
                "status": "ACTIVE",
                "date_of_joining": datetime.utcnow() - timedelta(days=180),
                "documents_uploaded": True,
                "policies_accepted": True,
                "phone": "+91-9999900000",
                "address": "Gurugram, India",
                "emergency_contact": "+91-9999900000",
                "avatar_url": None,
                "biometric_id": None,
                "manager_id": None,
                "manager_user_id": None,
                "application_id": None
            })

            db.users.insert_one({
                "_id": uid, "id": uid,
                "email": target_email,
                "hashed_password": hashed_password,
                "password_hash": hashed_password,
                "role": "EMPLOYEE",
                "entity_id": "Zipaworld",
                "employee_id": eid
            })

        processed_employee_ids.add(eid)
        processed_emails.add(target_email)

    # 3. Clean up imposter employees and users
    print("\n--- Cleaning up Imposters ---")
    all_employees = list(db.employees.find({}))
    deleted_emp_ids = []

    for emp in all_employees:
        emp_id = emp["_id"]
        emp_email = emp.get("email")

        # Delete if not in targeted list and not in preserved list
        if emp_id not in processed_employee_ids and emp_email not in preserve_emails:
            print(f"Deleting imposter employee: {emp.get('full_name')} ({emp_email})")
            db.employees.delete_one({"_id": emp_id})
            deleted_emp_ids.append(emp_id)

            # Delete corresponding user
            res_user = db.users.delete_one({"employee_id": emp_id})
            if res_user.deleted_count > 0:
                print(f"  Deleted corresponding user record.")

    # Also delete users who don't have matching active employee records, unless preserved
    all_users = list(db.users.find({}))
    for u in all_users:
        u_email = u.get("email")
        u_emp_id = u.get("employee_id")
        if u_email not in processed_emails and u_email not in preserve_emails:
            print(f"Deleting orphaned/imposter user: {u_email}")
            db.users.delete_one({"_id": u["_id"]})

    # Clean up associated collections for deleted employees
    if deleted_emp_ids:
        print(f"Cleaning other collections for {len(deleted_emp_ids)} deleted employees...")
        db.attendance.delete_many({"employee_id": {"$in": deleted_emp_ids}})
        db.biometric_logs.delete_many({"employee_id": {"$in": deleted_emp_ids}})
        db.leave_balances.delete_many({"employee_id": {"$in": deleted_emp_ids}})
        db.salary_structures.delete_many({"employee_id": {"$in": deleted_emp_ids}})
        db.leave_requests.delete_many({"employee_id": {"$in": deleted_emp_ids}})

    # 4. Re-assign Managers for Active Employees
    print("\n--- Re-assigning Managers ---")
    
    # Founder & CEO: Dr Ambrish
    ceo_emp = db.employees.find_one({"email": "ambrish@zipaworld.com"})
    ceo_id = ceo_emp["_id"] if ceo_emp else None
    ceo_user_id = ceo_emp.get("user_id") if ceo_emp else None

    # Sales Director: Rohit
    sales_director = db.employees.find_one({"email": "rohit@zipaworld.com"})
    sales_dir_id = sales_director["_id"] if sales_director else None
    sales_dir_user_id = sales_director.get("user_id") if sales_director else None

    # Sales Manager: Raj Kumar
    sales_manager = db.employees.find_one({"email": "sales@zipaworld.com"})
    sales_mgr_id = sales_manager["_id"] if sales_manager else None
    sales_mgr_user_id = sales_manager.get("user_id") if sales_manager else None

    # IT Manager: Ashish
    it_manager = db.employees.find_one({"email": "ashish@zipaworld.com"})
    it_mgr_id = it_manager["_id"] if it_manager else None
    it_mgr_user_id = it_manager.get("user_id") if it_manager else None

    # Operation Assistant Manager: Jeewan
    op_manager = db.employees.find_one({"email": "delops1@zipaworld.com"})
    op_mgr_id = op_manager["_id"] if op_manager else None
    op_mgr_user_id = op_manager.get("user_id") if op_manager else None

    for emp in db.employees.find({}):
        email = emp["email"]
        eid = emp["_id"]

        if email == "ambrish@zipaworld.com":
            # CEO reports to no one
            db.employees.update_one({"_id": eid}, {"$set": {"manager_id": None, "manager_user_id": None}})
        elif email in ["rohit@zipaworld.com", "ashish@zipaworld.com", "nandini@zipaworld.com", "nandika@zipaworld.com", "delops1@zipaworld.com", "shikha@zipaworld.com", "hr@zipaworld.com"]:
            # Department heads / SMM report to CEO
            db.employees.update_one({"_id": eid}, {"$set": {"manager_id": ceo_id, "manager_user_id": ceo_user_id}})
        elif email in ["sales@zipaworld.com", "swati1@zipaworld.com", "sales1@zipaworld.com", "bhanu@zipaworld.com"]:
            # Sales team reports to Sales Director
            db.employees.update_one({"_id": eid}, {"$set": {"manager_id": sales_dir_id, "manager_user_id": sales_dir_user_id}})
        elif emp["department_id"] == dept_map["IT"] and email != "ashish@zipaworld.com":
            # IT team reports to IT Manager
            db.employees.update_one({"_id": eid}, {"$set": {"manager_id": it_mgr_id, "manager_user_id": it_mgr_user_id}})
        elif email in ["gagan@zipaworld.com", "rashid@zipaworld.com"]:
            # Operation team reports to Operation Manager
            db.employees.update_one({"_id": eid}, {"$set": {"manager_id": op_mgr_id, "manager_user_id": op_mgr_user_id}})

    # 5. Populate Leave Balances and Salary Structures for Active Employees
    print("\n--- Seeding Leave Balances and Salary Structures ---")
    leave_types = list(db.leave_types.find({}))
    
    for emp in db.employees.find({}):
        eid = emp["_id"]
        
        # Seed leave balances if not present
        for lt in leave_types:
            code = lt["code"]
            if code in ("ML", "PL", "LOP"):
                continue
            
            existing_bal = db.leave_balances.find_one({"employee_id": eid, "leave_type_id": lt["_id"]})
            if not existing_bal:
                max_days = lt.get("max_per_year", 12)
                db.leave_balances.insert_one({
                    "_id": _id(), "id": _id(),
                    "entity_id": "Zipaworld",
                    "employee_id": eid,
                    "leave_type_id": lt["_id"],
                    "year": datetime.utcnow().year,
                    "entitled": max_days,
                    "used": 0,
                    "balance": max_days,
                    "carry_forward": 0,
                })
        
        # Seed salary structure if not present
        existing_salary = db.salary_structures.find_one({"employee_id": eid})
        if not existing_salary:
            db.salary_structures.insert_one({
                "_id": _id(), "id": _id(),
                "entity_id": "Zipaworld",
                "employee_id": eid,
                "basic": 25000.0,
                "hra": 10000.0,
                "conveyance": 1600.0,
                "medical": 1250.0,
                "special": 12150.0,
                "pf_employee": 1800.0,
                "pf_employer": 1800.0,
                "professional_tax": 200.0,
                "tds": 1500.0,
                "ctc": 50000.0,
                "is_active": True,
                "created_at": datetime.utcnow(),
            })

    print("\nDatabase feeding and imposter cleanup completed successfully!")

if __name__ == "__main__":
    run()
