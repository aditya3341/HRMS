import uuid
from datetime import datetime, date
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Dict, Any, Optional

from app.models.biometric_log import BiometricLog
from app.models.employee import Employee
from app.models.biometric_device import BiometricDevice
from app.services.attendance_service import AttendanceService

class BiometricService:
    @staticmethod
    def process_biometric_logs(db: Session, entity_id: Optional[uuid.UUID] = None) -> Dict[str, Any]:
        """
        Main processing loop for staged biometric logs.
        Decoupled from core attendance logic but triggers it.
        """
        # 1. Fetch unprocessed logs
        query = db.query(BiometricLog).filter(BiometricLog.processed == False)
        if entity_id:
            # This requires joining with device or mapping, 
            # for now we process all available if no entity filter.
            pass
            
        logs = query.order_by(BiometricLog.timestamp.asc()).all()
        
        if not logs:
            return {"processed_count": 0, "status": "No logs to process"}

        processing_stats = {
            "total_logs": len(logs),
            "successfully_processed": 0,
            "errors": []
        }

        # 2. Group logs by employee and day for deduplication
        # (employee_code, date) -> [logs]
        grouped_logs: Dict[tuple, List[BiometricLog]] = {}
        for log in logs:
            day = log.timestamp.date()
            key = (log.employee_code, day)
            if key not in grouped_logs:
                grouped_logs[key] = []
            grouped_logs[key].append(log)

        from app.models.biometric_mapping import BiometricMapping

        # 3. Process each group
        for (enrollment_id, day), day_logs in grouped_logs.items():
            try:
                # Resolve employee via BiometricMapping
                mapping = db.query(BiometricMapping).filter(
                    BiometricMapping.device_enrollment_id == enrollment_id
                ).first()

                employee = None
                if mapping:
                    employee = db.query(Employee).filter(Employee.id == mapping.employee_id).first()
                else:
                    # Fallback: Check if employee_code matches enrollment_id directly
                    employee = db.query(Employee).filter(Employee.employee_code == enrollment_id).first()

                if not employee:
                    # Log error but don't stop loop
                    processing_stats["errors"].append(f"No mapping or employee found for Enrollment ID: {enrollment_id}")
                    continue

                # Deduplicate: Min timestamp is IN, Max is OUT
                # Even if device provides punch_type, taking min/max is more robust for HR systems
                first_punch = min(day_logs, key=lambda x: x.timestamp)
                last_punch = max(day_logs, key=lambda x: x.timestamp)

                # TRIGGER ATTENDANCE LOGIC (Reuse existing service)
                # First Punch -> Check-in
                AttendanceService.check_in_by_employee(
                    db=db,
                    employee=employee,
                    entity_id=employee.entity_id,
                    timestamp=first_punch.timestamp,
                    device_info=f"BIOMETRIC_{first_punch.device_id or 'GENERIC'}"
                )

                # Last Punch (if different) -> Check-out
                if last_punch.timestamp > first_punch.timestamp:
                    AttendanceService.check_out_by_employee(
                        db=db,
                        employee=employee,
                        timestamp=last_punch.timestamp
                    )

                # Mark all logs in this group as processed
                for log in day_logs:
                    log.processed = True
                
                processing_stats["successfully_processed"] += len(day_logs)

            except Exception as e:
                db.rollback()
                processing_stats["errors"].append(f"System error processing {employee_code} on {day}: {str(e)}")

        db.commit()
        return processing_stats
