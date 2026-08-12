import uuid
import math
from typing import List, Optional
from datetime import datetime, timedelta, date
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc

from app.models.attendance import Attendance
from app.models.attendance_intelligence import AttendanceFraudFlag
from app.models.employee import Employee

class AttendanceFraudService:
    @staticmethod
    def haversine(lat1, lon1, lat2, lon2):
        """Distance in km between two GPS points."""
        R = 6371.0 # Earth radius
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    @staticmethod
    def detect_fraud(db: Session, employee_id: uuid.UUID):
        """
        Runs fraud detection algorithms on the employee's recent attendance.
        """
        # Get 10 most recent attendance records
        records = db.query(Attendance).filter(
            Attendance.employee_id == employee_id
        ).order_by(Attendance.date.desc()).limit(10).all()
        
        if len(records) < 2:
            return []
            
        flags = []
        
        # 1. Device Switching (More than 2 unique devices in 10 days)
        unique_devices = {r.device_id for r in records if r.device_id}
        if len(unique_devices) > 2:
            new_flag = AttendanceFraudFlag(
                employee_id=employee_id,
                date=datetime.utcnow(),
                fraud_type="DEVICE_SWITCH",
                severity="MEDIUM",
                details={"unique_devices": list(unique_devices), "reason": f"Detected {len(unique_devices)} devices in last 10 records."}
            )
            db.add(new_flag)
            flags.append(new_flag)
            
        # 2. Repeated Location Pattern (Same coordinates ± small noise repeated exactly 5+ times)
        # Often a sign of GPS spoofing to the exact same spot.
        # We check for exact matches if GPS accuracy is suspiciously constant.
        coords = [(r.latitude, r.longitude) for r in records if r.latitude and r.longitude]
        coord_counts = {}
        for c in coords:
            coord_counts[c] = coord_counts.get(c, 0) + 1
            
        for c, count in coord_counts.items():
            if count >= 5:
                # 5+ records have IDENTICAL lat/lng (very rare with real GPS)
                new_flag = AttendanceFraudFlag(
                    employee_id=employee_id,
                    date=datetime.utcnow(),
                    fraud_type="REPEATED_LOCATION",
                    severity="HIGH",
                    details={"location": c, "occurrence": count, "reason": "Identical GPS coordinates (spoofing suspect)"}
                )
                db.add(new_flag)
                flags.append(new_flag)
                
        # 3. Impossible Travel (Speed > 300 km/h between check-ins)
        for i in range(len(records) - 1):
            cur = records[i]
            prev = records[i+1] # records are sorted by date desc, so i+1 is 'earlier'
            
            if cur.latitude and cur.longitude and prev.latitude and prev.longitude:
                dist = AttendanceFraudService.haversine(cur.latitude, cur.longitude, prev.latitude, prev.longitude)
                
                # Time difference in hours
                # Attendance.date is 'date', check_in is 'datetime'.
                # Need absolute time between check-ins.
                if cur.check_in and prev.check_in:
                    time_diff = abs((cur.check_in - prev.check_in).total_seconds()) / 3600.0
                    if time_diff > 0:
                        speed = dist / time_diff
                        if speed > 300: # Over 300 km/h is highly suspicious 
                            new_flag = AttendanceFraudFlag(
                                employee_id=employee_id,
                                date=cur.check_in,
                                fraud_type="IMPOSSIBLE_TRAVEL",
                                severity="HIGH",
                                details={"distance": round(dist, 2), "hours": round(time_diff, 2), "speed": round(speed, 2)}
                            )
                            db.add(new_flag)
                            flags.append(new_flag)

        db.commit()
        return flags

    @staticmethod
    def get_pending_fraud(db: Session, employee_id: Optional[uuid.UUID] = None):
        query = db.query(AttendanceFraudFlag).filter(AttendanceFraudFlag.is_resolved == False)
        if employee_id:
            query = query.filter(AttendanceFraudFlag.employee_id == employee_id)
        return query.order_by(AttendanceFraudFlag.created_at.desc()).all()
        
    @staticmethod
    def resolve_flag(db: Session, flag_id: uuid.UUID, resolver_id: uuid.UUID):
        flag = db.get(AttendanceFraudFlag, flag_id)
        if flag:
            flag.is_resolved = True
            flag.resolved_by = resolver_id
            flag.resolved_at = datetime.utcnow()
            db.commit()
        return flag
