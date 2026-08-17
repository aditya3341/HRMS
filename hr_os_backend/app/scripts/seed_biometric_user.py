import uuid
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import SessionLocal
from app.models.user import User
from app.models.entity import Entity   # ✅ THIS FIXES THE FK ERROR
from app.auth.password import get_password_hash


def seed_biometric_user():
    db: Session = SessionLocal()

    email = "biometric@aaa2.com"

    # 🔍 Fetch entity id
    entity_id = db.execute(
        text("SELECT id FROM entities WHERE code = 'AAA2'")
    ).scalar()

    if not entity_id:
        raise Exception("❌ Entity AAA2 not found. Run entity seed first.")

    user = db.query(User).filter(User.email == email).first()

    if user:
        user.role = "BIOMETRIC_DEVICE"
        print(" Updated existing biometric user role")
    else:
        user = User(
            id=uuid.uuid4(),
            email=email,
            password_hash=get_password_hash("biometric123"),
            role="BIOMETRIC_DEVICE",
            entity_id=entity_id,
        )
        db.add(user)
        print(" Created biometric device user")

    db.commit()   # ✅ WILL NOW WORK
    db.close()

    print(" BIOMETRIC_DEVICE user committed successfully")


if __name__ == "__main__":
    seed_biometric_user()