import uuid
from datetime import date, datetime
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import asc

from app.models.employee import Employee
from app.models.biometric_log import BiometricLog
from app.models.attendance import Attendance
from app.models.enums import AttendanceStatus
from app.core.database import SessionLocal

class AttendanceProcessorService:
    @staticmethod
    def process_daily_biometrics(db: Session, employee_id: uuid.UUID, target_date: date) -> Optional[Attendance]:
        """
        Calculates check_in, check_out, total_hours from raw BiometricLog entries for a specific day.
        Updates or creates the Attendance record marking source="BIOMETRIC".
        """
        employee = db.query(Employee).filter(Employee.id == employee_id).first()
        if not employee:
            return None
        
        # Get start and end of the target date to filter logs
        start_of_day = datetime.combine(target_date, datetime.min.time())
        end_of_day = datetime.combine(target_date, datetime.max.time())
        
        # Fetch all biometric punches for this employee on this date
        logs: List[BiometricLog] = db.query(BiometricLog).filter(
            BiometricLog.employee_code == employee.employee_code,
            BiometricLog.timestamp >= start_of_day,
            BiometricLog.timestamp <= end_of_day
        ).order_by(BiometricLog.timestamp.asc()).all()
        
        if not logs:
            return None
            
        first_in = logs[0].timestamp
        last_out = logs[-1].timestamp if len(logs) > 1 else None
        
        total_hours = 0.0
        if last_out:
            duration = last_out - first_in
            total_hours = round(duration.total_seconds() / 3600, 2)
            
        # Determine Status 
        status = AttendanceStatus.PRESENT
        if total_hours < 4 and total_hours > 0:
            status = AttendanceStatus.HALF_DAY
        elif total_hours == 0:
            # Maybe they just punched in and no punch out yet
            status = AttendanceStatus.PRESENT 
            
        # Optional: Late Logic
        is_late = first_in.time() > datetime.strptime("09:30:00", "%H:%M:%S").time()
            
        # Upsert Attendance
        attendance = db.query(Attendance).filter(
            Attendance.employee_id == employee.id,
            Attendance.date == target_date
        ).first()
        
        if not attendance:
            attendance = Attendance(
                employee_id=employee.id,
                entity_id=employee.entity_id,
                date=target_date,
            )
            db.add(attendance)
            
        attendance.check_in = first_in
        attendance.check_out = last_out
        attendance.total_hours = total_hours
        attendance.status = status
        attendance.is_late = is_late
        attendance.source = "BIOMETRIC"
        attendance.verification_status = "VERIFIED"
        
        # Mark logs as processed
        for log in logs:
            log.processed = True
            
        db.commit()
        db.refresh(attendance)
        
        return attendance

    @staticmethod
    def manual_trigger(db: Session, target_date: Optional[date] = None):
        """
        Batch processor trigger over all employees for a given day
        """
        t_date = target_date or date.today()
        employees = db.query(Employee).filter(Employee.status == "ACTIVE").all()
        results = []
        for emp in employees:
            record = AttendanceProcessorService.process_daily_biometrics(db, emp.id, t_date)
            if record:
                results.append(record)
        return results
