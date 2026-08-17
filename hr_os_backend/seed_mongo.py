"""Seed MongoDB with complete HRMS demo data.

Run:  python seed_mongo.py
"""
import os
import sys
from datetime import datetime, timedelta
from uuid import uuid4

from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, os.path.dirname(__file__))

from app.auth.password import get_password_hash
from app.core.mongodb import connect_mongo, close_mongo


def _id():
    return str(uuid4())


def run():
    db = connect_mongo()
    print("[seed] Connected to MongoDB:", db.name)

    # Prevent accidental overwrites if data already exists
    if db.employees.count_documents({}) > 0:
        print("[seed] Database already seeded. Skipping to prevent overwriting existing data.")
        return

    # ── Entity ────────────────────────────────────────────────
    entity_id = "Zipaworld"
    db.entities.delete_many({})
    db.entities.insert_one({
        "_id": entity_id,
        "id": entity_id,
        "name": "Zipaworld Pvt Ltd",
        "code": "ZIPA",
        "settings": {},
    })
    print("[seed] Entity created:", entity_id)

    # ── Departments ───────────────────────────────────────────
    dept_map = {}
    db.departments.delete_many({})
    for name in ["HR", "Sales", "Finance", "IT", "Management", "Operation", "Social Media Management", "Legal and Compliance", "Custom Clearance", "Legal"]:
        did = _id()
        dept_map[name] = did
        db.departments.insert_one({
            "_id": did, "id": did,
            "name": name,
            "entity_id": entity_id,
            "created_at": datetime.utcnow(),
        })
    print(f"[seed] {len(dept_map)} departments created")

    # ── Users & Employees ─────────────────────────────────────
    password = get_password_hash("admin123")

    people = [
        {"full_name": "Admin User",       "email": "admin@zipaworld.com",   "role": "SUPER_ADMIN", "dept": "IT",      "designation": "CTO"},
        {"full_name": "HR Manager",        "email": "hr@zipaworld.com",     "role": "HR_ADMIN",    "dept": "HR",               "designation": "HR Head"},
        {"full_name": "Rajesh Kumar",      "email": "rajesh@zipaworld.com", "role": "MANAGER",     "dept": "IT",      "designation": "IT Manager"},
        {"full_name": "Priya Sharma",      "email": "priya@zipaworld.com",  "role": "EMPLOYEE",    "dept": "IT",      "designation": "Senior Developer"},
        {"full_name": "Amit Patel",        "email": "amit@zipaworld.com",   "role": "EMPLOYEE",    "dept": "IT",      "designation": "Developer"},
        {"full_name": "Neha Gupta",        "email": "neha@zipaworld.com",   "role": "EMPLOYEE",    "dept": "HR",               "designation": "HR Executive"},
        {"full_name": "Vikram Singh",      "email": "vikram@zipaworld.com", "role": "MANAGER",     "dept": "Sales",            "designation": "Sales Manager"},
        {"full_name": "Anita Desai",       "email": "anita@zipaworld.com",  "role": "EMPLOYEE",    "dept": "Social Media Management", "designation": "Marketing Executive"},
        {"full_name": "Suresh Reddy",      "email": "suresh@zipaworld.com", "role": "EMPLOYEE",    "dept": "Finance",          "designation": "Accountant"},
        {"full_name": "Kavita Joshi",      "email": "kavita@zipaworld.com", "role": "EMPLOYEE",    "dept": "Operation",        "designation": "Operations Analyst"},
    ]

    db.users.delete_many({})
    db.employees.delete_many({})
    user_ids = {}
    emp_ids = {}
    emp_data_list = []

    for idx, p in enumerate(people, start=1):
        uid = _id()
        eid = _id()
        user_ids[p["email"]] = uid
        emp_ids[p["email"]] = eid

        emp_code = f"ZIPA-{datetime.utcnow().year}-{idx:04d}"

        db.users.insert_one({
            "_id": uid, "id": uid,
            "email": p["email"],
            "hashed_password": password,
            "password_hash": password,
            "role": p["role"],
            "entity_id": entity_id,
            "employee_id": eid,
        })

        emp_doc = {
            "_id": eid, "id": eid,
            "user_id": uid,
            "entity_id": entity_id,
            "employee_code": emp_code,
            "full_name": p["full_name"],
            "email": p["email"],
            "designation": p["designation"],
            "department_id": dept_map[p["dept"]],
            "status": "ACTIVE",
            "date_of_joining": datetime.utcnow() - timedelta(days=365 + idx * 30),
            "documents_uploaded": True,
            "policies_accepted": True,
            "pan": f"ABCDE{1000+idx}F",
            "aadhaar": f"1234-5678-{9000+idx}",
            "uan": None,
            "bank_account": None,
            "phone": f"+91-98765{10000+idx}",
            "address": "Gurugram, Haryana",
            "emergency_contact": "+91-9876500000",
            "avatar_url": None,
            "biometric_id": None,
            "manager_id": None,
            "manager_user_id": None,
            "application_id": None,
        }
        emp_data_list.append(emp_doc)
        db.employees.insert_one(emp_doc)

    # Manager assignments
    admin_eid = emp_ids["admin@zipaworld.com"]
    rajesh_eid = emp_ids["rajesh@zipaworld.com"]
    hr_eid = emp_ids["hr@zipaworld.com"]
    vikram_eid = emp_ids["vikram@zipaworld.com"]

    # Rajesh reports to Admin
    db.employees.update_one({"_id": rajesh_eid}, {"$set": {"manager_id": admin_eid, "manager_user_id": user_ids["admin@zipaworld.com"]}})
    # HR reports to Admin
    db.employees.update_one({"_id": hr_eid}, {"$set": {"manager_id": admin_eid, "manager_user_id": user_ids["admin@zipaworld.com"]}})
    # Priya, Amit report to Rajesh
    for e in ["priya@zipaworld.com", "amit@zipaworld.com"]:
        db.employees.update_one({"_id": emp_ids[e]}, {"$set": {"manager_id": rajesh_eid, "manager_user_id": user_ids["rajesh@zipaworld.com"]}})
    # Neha reports to HR
    db.employees.update_one({"_id": emp_ids["neha@zipaworld.com"]}, {"$set": {"manager_id": hr_eid, "manager_user_id": user_ids["hr@zipaworld.com"]}})
    # Vikram reports to Admin
    db.employees.update_one({"_id": vikram_eid}, {"$set": {"manager_id": admin_eid, "manager_user_id": user_ids["admin@zipaworld.com"]}})
    # Anita reports to Vikram
    db.employees.update_one({"_id": emp_ids["anita@zipaworld.com"]}, {"$set": {"manager_id": vikram_eid, "manager_user_id": user_ids["vikram@zipaworld.com"]}})
    # Suresh, Kavita report to Admin
    for e in ["suresh@zipaworld.com", "kavita@zipaworld.com"]:
        db.employees.update_one({"_id": emp_ids[e]}, {"$set": {"manager_id": admin_eid, "manager_user_id": user_ids["admin@zipaworld.com"]}})

    print(f"[seed] {len(people)} users and employees created")

    # ── Leave Types ───────────────────────────────────────────
    db.leave_types.delete_many({})
    leave_types = [
        {"name": "Casual Leave",     "code": "CL", "is_paid": True,  "max_per_year": 12, "color": "#3B82F6"},
        {"name": "Sick Leave",       "code": "SL", "is_paid": True,  "max_per_year": 12, "color": "#EF4444"},
        {"name": "Earned Leave",     "code": "EL", "is_paid": True,  "max_per_year": 15, "color": "#10B981"},
        {"name": "Maternity Leave",  "code": "ML", "is_paid": True,  "max_per_year": 180,"color": "#EC4899"},
        {"name": "Paternity Leave",  "code": "PL", "is_paid": True,  "max_per_year": 15, "color": "#8B5CF6"},
        {"name": "Loss of Pay",      "code": "LOP","is_paid": False, "max_per_year": 365,"color": "#6B7280"},
        {"name": "Compensatory Off", "code": "CO", "is_paid": True,  "max_per_year": 12, "color": "#F59E0B"},
    ]
    lt_ids = {}
    for lt in leave_types:
        lid = _id()
        lt_ids[lt["code"]] = lid
        db.leave_types.insert_one({
            "_id": lid, "id": lid,
            "entity_id": entity_id,
            "name": lt["name"],
            "code": lt["code"],
            "description": f"{lt['name']} policy",
            "is_paid": lt["is_paid"],
            "max_per_year": lt["max_per_year"],
            "allow_negative_balance": False,
            "requires_approval": True,
            "color": lt["color"],
            "is_active": True,
        })
    print(f"[seed] {len(leave_types)} leave types created")

    # ── Leave Balances (for each employee × leave type) ───────
    db.leave_balances.delete_many({})
    balance_count = 0
    for email, eid in emp_ids.items():
        for code, lid in lt_ids.items():
            max_days = next(lt["max_per_year"] for lt in leave_types if lt["code"] == code)
            if code in ("ML", "PL", "LOP"):
                continue  # skip special leaves
            bid = _id()
            db.leave_balances.insert_one({
                "_id": bid, "id": bid,
                "entity_id": entity_id,
                "employee_id": eid,
                "leave_type_id": lid,
                "year": datetime.utcnow().year,
                "entitled": max_days,
                "used": 0,
                "balance": max_days,
                "carry_forward": 0,
            })
            balance_count += 1
    print(f"[seed] {balance_count} leave balances created")

    # ── Holidays ──────────────────────────────────────────────
    db.holidays.delete_many({})
    holidays = [
        ("Republic Day",       "2026-01-26"),
        ("Holi",               "2026-03-14"),
        ("Good Friday",        "2026-04-03"),
        ("May Day",            "2026-05-01"),
        ("Independence Day",   "2026-08-15"),
        ("Gandhi Jayanti",     "2026-10-02"),
        ("Dussehra",           "2026-10-12"),
        ("Diwali",             "2026-11-01"),
        ("Christmas",          "2026-12-25"),
    ]
    for name, dt_str in holidays:
        hid = _id()
        db.holidays.insert_one({
            "_id": hid, "id": hid,
            "entity_id": entity_id,
            "name": name,
            "date": datetime.strptime(dt_str, "%Y-%m-%d"),
            "is_optional": False,
        })
    print(f"[seed] {len(holidays)} holidays created")

    # ── Salary Structures ─────────────────────────────────────
    db.salary_structures.delete_many({})
    base_salaries = {
        "CTO": 200000, "HR Head": 150000, "IT Manager": 120000,
        "Senior Developer": 100000, "Developer": 80000, "HR Executive": 70000,
        "Sales Manager": 110000, "Marketing Executive": 75000,
        "Accountant": 70000, "Operations Analyst": 65000,
    }
    for p in people:
        sid = _id()
        base = base_salaries.get(p["designation"], 60000)
        hra = int(base * 0.40)
        da = int(base * 0.10)
        db.salary_structures.insert_one({
            "_id": sid, "id": sid,
            "entity_id": entity_id,
            "employee_id": emp_ids[p["email"]],
            "basic": base,
            "hra": hra,
            "da": da,
            "special_allowance": int(base * 0.15),
            "gross": base + hra + da + int(base * 0.15),
            "pf_deduction": int(base * 0.12),
            "tax_deduction": int(base * 0.10),
            "effective_from": datetime.utcnow() - timedelta(days=365),
            "is_active": True,
        })
    print(f"[seed] {len(people)} salary structures created")

    # ── Jobs ──────────────────────────────────────────────────
    db.jobs.delete_many({})
    jobs_data = [
        {"title": "Senior Python Developer",  "department": "IT", "status": "OPEN",   "openings": 2},
        {"title": "HR Generalist",             "department": "Human Resources","status": "OPEN","openings": 1},
        {"title": "Marketing Intern",          "department": "Marketing",  "status": "CLOSED", "openings": 3},
    ]
    job_ids = {}
    for j in jobs_data:
        jid = _id()
        job_ids[j["title"]] = jid
        db.jobs.insert_one({
            "_id": jid, "id": jid,
            "entity_id": entity_id,
            "title": j["title"],
            "department": j["department"],
            "description": f"Looking for a talented {j['title']}",
            "requirements": "3+ years experience",
            "location": "Gurugram",
            "status": j["status"],
            "openings": j["openings"],
            "created_at": datetime.utcnow() - timedelta(days=30),
            "created_by": user_ids["hr@zipaworld.com"],
        })
    print(f"[seed] {len(jobs_data)} jobs created")

    # ── Applications ──────────────────────────────────────────
    db.applications.delete_many({})
    apps = [
        {"name": "Rahul Verma",    "email": "rahul@gmail.com",   "job": "Senior Python Developer", "status": "APPLIED"},
        {"name": "Sneha Mehta",    "email": "sneha@gmail.com",   "job": "Senior Python Developer", "status": "INTERVIEW_L1"},
        {"name": "Deepak Jain",    "email": "deepak@gmail.com",  "job": "HR Generalist",           "status": "APPLIED"},
    ]
    for a in apps:
        aid = _id()
        db.applications.insert_one({
            "_id": aid, "id": aid,
            "entity_id": entity_id,
            "job_id": job_ids[a["job"]],
            "candidate_name": a["name"],
            "candidate_email": a["email"],
            "resume_url": None,
            "status": a["status"],
            "created_at": datetime.utcnow() - timedelta(days=10),
            "notes": "",
        })
    print(f"[seed] {len(apps)} applications created")

    # ── Permissions & Role-Permission Mapping ─────────────────
    db.permissions.delete_many({})
    db.role_permissions.delete_many({})
    from app.auth.constants import Permissions as P
    all_perms = [v for k, v in vars(P).items() if not k.startswith("_")]

    for code in all_perms:
        pid = _id()
        db.permissions.insert_one({
            "_id": pid, "id": pid,
            "code": code,
            "description": code.replace(".", " ").title(),
        })

    role_perm_map = {
        "SUPER_ADMIN": all_perms,
        "HR_ADMIN": all_perms,
        "MANAGER": [
            P.DASHBOARD_READ, P.EMPLOYEE_VIEW, P.EMPLOYEE_READ,
            P.ATTENDANCE_READ, P.ATTENDANCE_MARK,
            P.LEAVE_READ, P.LEAVE_APPROVE,
            P.NOTIFICATION_READ, P.NOTIFICATION_SEND,
            P.PERFORMANCE_VIEW, P.PERFORMANCE_MANAGE,
        ],
        "EMPLOYEE": [
            P.DASHBOARD_READ, P.EMPLOYEE_SELF, P.EMPLOYEE_VIEW,
            P.ATTENDANCE_READ, P.ATTENDANCE_CHECKIN, P.ATTENDANCE_CHECKOUT,
            P.LEAVE_READ, P.LEAVE_REQUEST,
            P.NOTIFICATION_READ, P.PERFORMANCE_VIEW,
        ],
    }
    for role, perms in role_perm_map.items():
        rpid = _id()
        db.role_permissions.insert_one({
            "_id": rpid, "id": rpid,
            "role": role,
            "permissions": perms,
            "entity_id": entity_id,
        })
    print(f"[seed] Permissions and role mappings seeded")

    # ── System Configs ────────────────────────────────────────
    db.system_configs.delete_many({})
    configs = {
        "company_name": "Zipaworld Pvt Ltd",
        "work_start_time": "09:00",
        "work_end_time": "18:00",
        "late_threshold_minutes": "15",
        "half_day_threshold_hours": "4",
        "financial_year_start": "04",
        "leave_year_type": "CALENDAR",
        "currency": "INR",
        "timezone": "Asia/Kolkata",
    }
    for key, value in configs.items():
        cid = _id()
        db.system_configs.insert_one({
            "_id": cid, "id": cid,
            "entity_id": entity_id,
            "key": key,
            "value": value,
            "category": "general",
            "updated_at": datetime.utcnow(),
            "updated_by": user_ids["admin@zipaworld.com"],
        })
    print(f"[seed] {len(configs)} system configs created")

    # ── Performance Cycles ────────────────────────────────────
    db.performance_cycles.delete_many({})
    pc_id = _id()
    db.performance_cycles.insert_one({
        "_id": pc_id, "id": pc_id,
        "entity_id": entity_id,
        "name": "FY 2026-27 Annual Review",
        "cycle_type": "ANNUAL",
        "start_date": datetime(2026, 4, 1),
        "end_date": datetime(2027, 3, 31),
        "status": "ACTIVE",
        "created_at": datetime.utcnow(),
    })
    print("[seed] Performance cycle created")

    # ── IT Assets ─────────────────────────────────────────────
    db.it_assets.delete_many({})
    assets = [
        {"name": "MacBook Pro 14", "type": "Laptop",  "serial": "MBP-2026-001", "status": "ASSIGNED", "assigned_to": emp_ids["priya@zipaworld.com"]},
        {"name": "Dell Monitor 27", "type": "Monitor", "serial": "DM-2026-001",  "status": "ASSIGNED", "assigned_to": emp_ids["amit@zipaworld.com"]},
        {"name": "Logitech Webcam", "type": "Webcam",  "serial": "LW-2026-001",  "status": "AVAILABLE", "assigned_to": None},
    ]
    for a in assets:
        aid_val = _id()
        db.it_assets.insert_one({
            "_id": aid_val, "id": aid_val,
            "entity_id": entity_id,
            "name": a["name"],
            "asset_type": a["type"],
            "serial_number": a["serial"],
            "status": a["status"],
            "assigned_to": a["assigned_to"],
            "purchase_date": datetime.utcnow() - timedelta(days=180),
            "warranty_end": datetime.utcnow() + timedelta(days=730),
            "notes": "",
        })
    print(f"[seed] {len(assets)} IT assets created")

    # ── Create indexes ────────────────────────────────────────
    db.users.create_index("email", unique=True)
    db.employees.create_index("entity_id")
    db.employees.create_index("user_id")
    db.employees.create_index("employee_code", unique=True)
    db.employees.create_index("email")
    db.employees.create_index("manager_id")
    db.departments.create_index("entity_id")
    db.leave_types.create_index("entity_id")
    db.leave_balances.create_index([("employee_id", 1), ("leave_type_id", 1), ("year", 1)])
    db.leave_requests.create_index("employee_id")
    db.attendance.create_index([("employee_id", 1), ("date", 1)])
    db.salary_structures.create_index("employee_id")
    db.jobs.create_index("entity_id")
    db.applications.create_index("entity_id")
    db.notifications.create_index("user_id")
    db.audit_logs.create_index("entity_id")
    print("[seed] Indexes created")

    print("\n=== SEED COMPLETE - HRMS database is ready ===")
    print(f"   Admin login: admin@zipaworld.com / admin123")
    print(f"   HR login:    hr@zipaworld.com    / admin123")
    print(f"   All users share password: admin123")

    close_mongo()


if __name__ == "__main__":
    run()
