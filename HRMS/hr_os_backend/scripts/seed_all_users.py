import os
import sys
import uuid
from pymongo import MongoClient

# Add app path to sys.path to resolve imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.entity import Entity
from app.models.employee import Employee
from app.models.user import User
from app.auth.password import get_password_hash

def seed_all_users():
    db = SessionLocal()
    try:
        # Get all employees
        employees = db.query(Employee).all()
        print(f"Found {len(employees)} employees in SQLite.")

        # Default password for everyone
        default_password = "password123"
        hashed_password = get_password_hash(default_password)

        created_sqlite_count = 0
        mongo_users = []

        for emp in employees:
            if not emp.email:
                continue

            # Check if user exists in SQLite
            user = db.query(User).filter(User.email == emp.email).first()
            if not user:
                user = User(
                    id=uuid.uuid4(),
                    email=emp.email,
                    password_hash=hashed_password,
                    role="EMPLOYEE",
                    entity_id=emp.entity_id,
                    employee_id=emp.id
                )
                db.add(user)
                
                # Also link employee to user if not linked
                if not emp.user_id:
                    emp.user_id = user.id
                
                created_sqlite_count += 1
            else:
                # Update password just in case they couldn't log in
                user.password_hash = hashed_password

            db.commit()
            db.refresh(user)

            # Prepare for Mongo insertion
            mongo_users.append({
                "sqlite_user_id": str(user.id),
                "email": user.email,
                "password_hash": user.password_hash,
                "role": user.role,
                "entity_id": str(user.entity_id),
                "employee_id": str(user.employee_id) if user.employee_id else None,
                "original_password_set": default_password
            })

        print(f"Created {created_sqlite_count} new users in SQLite. Passwords reset to '{default_password}'.")

        # Now connect to MongoDB
        mongo_url = os.getenv("MONGO_URL", "mongodb://20.193.150.156:27017/hr_onboarding?authSource=hr_onboarding")
        print(f"Connecting to MongoDB at {mongo_url}...")
        client = MongoClient(mongo_url, serverSelectionTimeoutMS=30000, connectTimeoutMS=30000)
        
        try:
            client.admin.command('ping')
            mongo_db = client['hr_onboarding']
            users_col = mongo_db['users']

            mongo_created_count = 0
            mongo_updated_count = 0

            for mu in mongo_users:
                existing = users_col.find_one({"email": mu["email"]})
                if not existing:
                    users_col.insert_one(mu)
                    mongo_created_count += 1
                else:
                    users_col.update_one({"_id": existing["_id"]}, {"$set": {"password_hash": mu["password_hash"], "original_password_set": default_password}})
                    mongo_updated_count += 1
            
            print(f"MongoDB: Created {mongo_created_count} users, Updated {mongo_updated_count} users.")
        except Exception as e:
            print(f"Failed to connect to MongoDB or update: {e}")

    finally:
        db.close()

if __name__ == "__main__":
    seed_all_users()
