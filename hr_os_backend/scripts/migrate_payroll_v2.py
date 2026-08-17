import uuid
from sqlalchemy import text
from app.core.database import SessionLocal

def migrate():
    db = SessionLocal()
    try:
        print("Starting Payroll Hardening Migration...")
        
        # New columns to add to payroll_entries
        columns = [
            ("absences_count", "FLOAT DEFAULT 0.0"),
            ("approved_leave_count", "FLOAT DEFAULT 0.0"),
            ("rejected_leave_count", "FLOAT DEFAULT 0.0"),
            ("half_day_count", "FLOAT DEFAULT 0.0"),
            ("overlap_count", "FLOAT DEFAULT 0.0"),
            ("override_reason", "VARCHAR"),
            ("overridden_by", "UUID REFERENCES users(id)"),
            ("overridden_at", "TIMESTAMP WITHOUT TIME ZONE")
        ]

        for col_name, col_type in columns:
            try:
                print(f"Adding column {col_name}...")
                db.execute(text(f"ALTER TABLE payroll_entries ADD COLUMN {col_name} {col_type}"))
                db.commit()
            except Exception as e:
                db.rollback()
                if "already exists" in str(e).lower():
                    print(f"  Column {col_name} already exists. Skipping.")
                else:
                    print(f"  Error adding column {col_name}: {e}")

        print("Migration completed successfully.")
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
