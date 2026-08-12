from app.models.permission import Permission
from app.auth.constants import Permissions
from app.core.database import SessionLocal

def seed():
    db = SessionLocal()
    print(" Seeding permissions from constants...")
    
    # Extract all attributes from Permissions class that are not private
    permission_codes = [
        getattr(Permissions, attr) 
        for attr in dir(Permissions) 
        if not attr.startswith("__") and isinstance(getattr(Permissions, attr), str)
    ]

    for code in permission_codes:
        existing = db.query(Permission).filter_by(code=code).first()

        if not existing:
            perm = Permission(code=code, description=f"Permission for {code}")
            db.add(perm)
            print(f" Created permission: {code}")
        else:
            print(f" Permission already exists: {code}")

    db.commit()
    db.close()

if __name__ == "__main__":
    seed()