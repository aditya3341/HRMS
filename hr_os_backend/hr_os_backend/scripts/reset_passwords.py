"""Reset passwords for all users to password123"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.models.entity import Entity
from app.models.employee import Employee
from app.models.user import User
from app.core.database import SessionLocal
from app.auth.password import get_password_hash

db = SessionLocal()
users = db.query(User).all()
hashed = get_password_hash("password123")
for u in users:
    u.password_hash = hashed
db.commit()
db.close()
print(f"Reset password for {len(users)} users to: password123")
