import sys
import os
from datetime import date
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.database import SessionLocal
from app.services.attendance_service import AttendanceService

def main():
    db = SessionLocal()
    try:
        print(f"Starting Attendance Sync for {date.today()}...")
        AttendanceService.run_daily_sync(db)
        print("Attendance Sync completed successfully.")
    except Exception as e:
        print(f"Error during Attendance Sync: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
