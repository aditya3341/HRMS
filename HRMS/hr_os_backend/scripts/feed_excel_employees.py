import os
import sys
import openpyxl
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

# Standard employees target definition to inherit designation and departments
standard_targets = [
    {"code": "ZW_079", "name": "Nandini", "email": "nandini@zipaworld.com", "designation": "SMM Specialist", "dept": "Social Media Management"},
    {"code": "ZW_081", "name": "Nandika", "email": "nandika@zipaworld.com", "designation": "Content and Community Executive", "dept": "Social Media Management"},
    {"code": "ZW_008", "name": "Rohit", "email": "rohit@zipaworld.com", "designation": "Director", "dept": "Sales"},
    {"code": "ZW_045", "name": "Swati", "email": "swati1@zipaworld.com", "designation": "Assistant Manager - Sales", "dept": "Sales"},
    {"code": "SWZP0011", "name": "Raj Kumar", "email": "sales@zipaworld.com", "designation": "Manager EDI & Operations", "dept": "Sales"},
    {"code": "SWZP0025", "name": "Durga", "email": "sales1@zipaworld.com", "designation": "Sales Executive", "dept": "Sales"},
    {"code": "ZW_078", "name": "Bhanu", "email": "bhanu@zipaworld.com", "designation": "Business Development Manager", "dept": "Sales"},
    {"code": "ZW_040", "name": "Jeewan", "email": "delops1@zipaworld.com", "designation": "Assistant Manager (Domestic)", "dept": "Operation"},
    {"code": "ZW_061", "name": "Shikha", "email": "shikha@zipaworld.com", "designation": "Deputy Manager Pricing", "dept": "Operation"},
    {"code": "SWZP0005", "name": "Gagan", "email": "gagan@zipaworld.com", "designation": "Sr. Operation Executive", "dept": "Operation"},
    {"code": "ZW_080", "name": "Rashid", "email": "rashid@zipaworld.com", "designation": "Sr. Executive - Air export Pricing", "dept": "Operation"},
    {"code": "ZW_012", "name": "Dr Ambrish", "email": "ambrish@zipaworld.com", "designation": "Founder & CEO", "dept": "Management"},
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

# Create helper matching maps
target_by_email = {}
target_by_name = {}
for t in standard_targets:
    target_by_email[t["email"].lower().strip()] = t
    target_by_name[t["name"].lower().strip()] = t

# Map target email to existing employee email in db to align with old user database keys
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

def run():
    db = connect_mongo()
    print("Database connected:", db.name)

    # 1. Clean departments (remove duplicates, merge Engineering -> IT)
    depts = list(db.departments.find({}))
    dept_by_name = {}
    
    # Standardize and deduplicate
    for d in depts:
        name = d["name"].strip()
        
        # Merge Engineering -> IT
        if name.lower() == "engineering":
            name = "IT"
            
        if name not in dept_by_name:
            dept_by_name[name] = []
        dept_by_name[name].append(d)

    # Ensure standard departments exist
    standard_dept_names = ["Social Media Management", "Sales", "Operation", "Management", "IT"]
    for sdn in standard_dept_names:
        if sdn not in dept_by_name:
            did = _id()
            db.departments.insert_one({
                "_id": did, "id": did,
                "name": sdn,
                "entity_id": "Zipaworld",
                "created_at": datetime.utcnow()
            })
            # Reload
            dept_by_name[sdn] = [{"_id": did, "id": did, "name": sdn}]
            print(f"Created missing department: {sdn}")

    # Map department name to primary ID, delete duplicates and update employees
    dept_id_map = {}
    for name, group in dept_by_name.items():
        primary = group[0]
        primary_id = primary["_id"]
        dept_id_map[name] = primary_id
        
        # Keep primary, update name if needed, delete duplicates
        if primary.get("name") != name:
            db.departments.update_one({"_id": primary_id}, {"$set": {"name": name}})
            
        # Merge duplicates or mismatched (like Engineering)
        for duplicate in group[1:]:
            dup_id = duplicate["_id"]
            print(f"Merging duplicate department '{duplicate['name']}' ({dup_id}) -> '{name}' ({primary_id})")
            db.employees.update_many({"department_id": dup_id}, {"$set": {"department_id": primary_id}})
            db.departments.delete_one({"_id": dup_id})
            
        # Also handle any external Engineering department IDs that weren't caught
        if name == "IT":
            # Find any old Engineering departments and merge them
            for d in depts:
                if d["name"].strip().lower() == "engineering" and d["_id"] != primary_id:
                    print(f"Merging old Engineering department ({d['_id']}) into IT ({primary_id})")
                    db.employees.update_many({"department_id": d["_id"]}, {"$set": {"department_id": primary_id}})
                    db.departments.delete_one({"_id": d["_id"]})

    # Clear out any leftover duplicates from standard_dept_names list
    # Ensure there is exactly 1 department doc per name
    for name in standard_dept_names:
        docs = list(db.departments.find({"name": name}))
        if len(docs) > 1:
            primary_id = docs[0]["_id"]
            for extra in docs[1:]:
                db.employees.update_many({"department_id": extra["_id"]}, {"$set": {"department_id": primary_id}})
                db.departments.delete_one({"_id": extra["_id"]})
                print(f"Cleaned extra duplicate of {name} department")

    print("Resolved departments mapping:", {k: v for k, v in dept_id_map.items()})

    # 2. Parse Excel file for unique employees
    excel_path = r"C:\Users\User\Downloads\Asset Laptop (2).xlsx"
    print("Reading Excel file:", excel_path)
    wb = openpyxl.load_workbook(excel_path, data_only=True)
    sheet = wb.active
    rows = list(sheet.iter_rows(values_only=True))
    wb.close()

    excel_people = {}
    for idx in range(3, len(rows)):
        row = rows[idx]
        if len(row) < 2:
            continue
        name = row[0]
        email = row[1]
        
        if not name:
            continue
            
        name_clean = name.strip()
        if name_clean.lower() in ["assigned to", "warehouse", "it stock", "mobile phones", "none", "n/a", "unassigned"]:
            continue
            
        email_clean = email.strip().lower() if email else None
        
        # Keep track of person
        if name_clean not in excel_people:
            excel_people[name_clean] = email_clean

    print(f"Extracted {len(excel_people)} unique people from Excel sheet")

    # Set of emails to preserve
    preserve_emails = {"admin@zipaworld.com", "admin@aaa2.com", "hr@zipaworld.com"}
    processed_emails = set()

    # Pre-hash password
    hashed_password = get_password_hash("password123")

    # Feed / update employees
    print("\n--- Seeding/Feeding Employees ---")
    code_counter = 100
    processed_user_emails = set(preserve_emails)
    
    for name_clean, email_clean in excel_people.items():
        # Resolve target email
        target_email = email_clean
        if not target_email:
            # Check standard target match by name
            matched_target = target_by_name.get(name_clean.lower())
            if matched_target:
                target_email = matched_target["email"]
            else:
                email_part = name_clean.lower().replace(" ", ".")
                target_email = f"{email_part}@zipaworld.com"

        target_email = target_email.lower().strip()
        
        # Deduplicate emails in this run to avoid duplicate key errors
        if target_email in processed_user_emails:
            # Generate a new unique email based on name
            email_part = name_clean.lower().replace(" ", ".")
            target_email = f"{email_part}@zipaworld.com"
            while target_email in processed_user_emails or db.users.find_one({"email": target_email}):
                target_email = f"{email_part}_{str(uuid4())[:4]}@zipaworld.com"

        processed_user_emails.add(target_email)
        db_email_to_lookup = matching_map.get(target_email, target_email)

        # Check standard targets matches
        matched_target = target_by_email.get(target_email) or target_by_name.get(name_clean.lower())

        # Determine Employee Code
        employee_code = None
        if matched_target:
            employee_code = matched_target["code"]
        else:
            code_counter += 1
            employee_code = f"ZW_{code_counter}"

        # Lookup in DB
        lookup_emails = [target_email, db_email_to_lookup]
        if matched_target:
            lookup_emails.append(matched_target["email"].lower().strip())
            
        lookup_codes = [employee_code]
        if matched_target:
            lookup_codes.append(matched_target["code"])

        existing_emp = db.employees.find_one({
            "$or": [
                {"email": {"$in": lookup_emails}},
                {"employee_code": {"$in": lookup_codes}}
            ]
        })

        # Resolve Designation and Department name
        designation = "Software Developer"
        dept_name = "IT"

        if matched_target:
            designation = matched_target["designation"]
            dept_name = matched_target["dept"]
        else:
            # Keyword matching for other custom entries
            name_lower = name_clean.lower()
            if any(k in name_lower or k in target_email for k in ["nandini", "nandika", "smm"]):
                designation = "SMM Specialist"
                dept_name = "Social Media Management"
            elif any(k in name_lower or k in target_email for k in ["rohit", "bhanu", "swati", "durga", "sales", "kumar"]):
                designation = "Sales Executive"
                dept_name = "Sales"
            elif any(k in name_lower or k in target_email for k in ["delops", "jeewan", "shikha", "gagan", "rashid"]):
                designation = "Operation Executive"
                dept_name = "Operation"
            elif "ambrish" in name_lower:
                designation = "Founder & CEO"
                dept_name = "Management"

        # Lookup department ID
        dept_id = dept_id_map.get(dept_name, dept_id_map["IT"])

        if existing_emp:
            eid = existing_emp["_id"]
            print(f"Updating employee: {existing_emp.get('full_name')} ({existing_emp.get('email')}) -> {name_clean} ({target_email}) | Dept: {dept_name}")
            avatar_url = existing_emp.get("avatar_url") or "/zipaworld_logo_light.png"
            banner_url = existing_emp.get("banner_url") or "/default_banner.jpg"
            db.employees.update_one(
                {"_id": eid},
                {"$set": {
                    "full_name": name_clean,
                    "email": target_email,
                    "employee_code": employee_code,
                    "designation": designation,
                    "department_id": dept_id,
                    "status": "ACTIVE",
                    "avatar_url": avatar_url,
                    "banner_url": banner_url
                }}
            )
            # Link user
            user_doc = db.users.find_one({"employee_id": eid})
            if user_doc:
                db.users.update_one(
                    {"_id": user_doc["_id"]},
                    {"$set": {
                        "email": target_email,
                        "avatar_url": avatar_url
                    }}
                )
            else:
                uid = _id()
                db.users.insert_one({
                    "_id": uid, "id": uid,
                    "email": target_email,
                    "hashed_password": hashed_password,
                    "password_hash": hashed_password,
                    "role": "EMPLOYEE",
                    "entity_id": "Zipaworld",
                    "employee_id": eid,
                    "avatar_url": avatar_url
                })
                db.employees.update_one({"_id": eid}, {"$set": {"user_id": uid}})
        else:
            # Create new
            eid = _id()
            uid = _id()
            print(f"Creating new employee: {name_clean} ({target_email}) | Dept: {dept_name}")
            db.employees.insert_one({
                "_id": eid, "id": eid,
                "user_id": uid,
                "entity_id": "Zipaworld",
                "employee_code": employee_code,
                "full_name": name_clean,
                "email": target_email,
                "designation": designation,
                "department_id": dept_id,
                "status": "ACTIVE",
                "date_of_joining": datetime.utcnow() - timedelta(days=180),
                "documents_uploaded": True,
                "policies_accepted": True,
                "phone": "+91-9999900000",
                "address": "Gurugram, India",
                "emergency_contact": "+91-9999900000",
                "avatar_url": "/zipaworld_logo_light.png",
                "banner_url": "/default_banner.jpg",
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
                "employee_id": eid,
                "avatar_url": "/zipaworld_logo_light.png"
            })

        processed_emails.add(target_email)

    # 3. Cleanup duplicates in employees collection (if any)
    print("\n--- Deduplicating employees ---")
    all_emps = list(db.employees.find({}))
    seen_emails = {}
    for emp in all_emps:
        email = emp.get("email", "").strip().lower()
        if not email:
            continue
        if email not in seen_emails:
            seen_emails[email] = emp
        else:
            # Keep first one, delete duplicate
            dup_id = emp["_id"]
            orig_id = seen_emails[email]["_id"]
            print(f"Removing duplicate employee record for {email} ({dup_id}) -> Keeping ({orig_id})")
            db.employees.delete_one({"_id": dup_id})
            db.users.delete_one({"employee_id": dup_id})

    # 4. Clean up mock/imposter employees (those not in Excel and not preserved)
    print("\n--- Cleaning up Imposters ---")
    current_emps = list(db.employees.find({}))
    for emp in current_emps:
        emp_email = emp.get("email", "").strip().lower()
        if emp_email not in processed_emails and emp_email not in preserve_emails:
            print(f"Deleting imposter/test employee: {emp.get('full_name')} ({emp_email})")
            db.employees.delete_one({"_id": emp["_id"]})
            db.users.delete_one({"employee_id": emp["_id"]})

    print("\nSeeding completed successfully!")

if __name__ == "__main__":
    run()
