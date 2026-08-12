import uuid
from typing import Optional, List
from datetime import date, datetime, timedelta, time
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract

from app.models.attendance import Attendance
from app.models.attendance_intelligence import AttendanceBehaviorSummary
from app.models.enums import AttendanceStatus

class AttendanceBehaviorService:
    @staticmethod
    def calculate_monthly_behavior(db: Session, employee_id: uuid.UUID, month: int, year: int):
        """
        Computes behavior metrics for an employee for a specific month.
        """
        # 1. Fetch all attendance records for the month
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1)
        else:
            end_date = date(year, month + 1, 1)
            
        records = db.query(Attendance).filter(
            Attendance.employee_id == employee_id,
            Attendance.date >= start_date,
            Attendance.date < end_date
        ).all()
        
        if not records:
            return None
            
        # 2. Compute metrics
        total_present = 0
        total_late = 0
        total_absent = 0
        total_half_day = 0
        
        check_in_hours = []
        working_hours = []
        
        for r in records:
            if r.status == AttendanceStatus.PRESENT:
                total_present += 1
            elif r.status == AttendanceStatus.LATE:
                total_late += 1
                total_present += 1 # Late is still present
            elif r.status == AttendanceStatus.ABSENT:
                total_absent += 1
            elif r.status == AttendanceStatus.HALF_DAY:
                total_half_day += 1
                
            if r.check_in:
                # Convert time to decimal hour (e.g. 09:30 -> 9.5)
                h = r.check_in.hour + (r.check_in.minute / 60.0)
                check_in_hours.append(h)
                
            if r.total_hours:
                working_hours.append(r.total_hours)
                
        # Calculations
        count_present = len(check_in_hours)
        avg_check_in = sum(check_in_hours) / count_present if count_present > 0 else None
        
        # Consistency score (0 to 1) 
        # For simplicity: Standard Deviation of check-in times. 
        # Lower variance = higher consistency.
        consistency_score = 1.0
        if count_present > 1 and avg_check_in is not None:
            variance = sum((h - avg_check_in) ** 2 for h in check_in_hours) / (count_present - 1)
            std_dev = variance ** 0.5
            # Map std_dev (hours) to a 0-1 score. e.g., 0-30 min window is very high consistency.
            # score = max(0, 1 - std_dev/2) -> 2 hours variation = 0 score
            consistency_score = max(0.0, 1.0 - (std_dev / 2.0))
            
        # 3. Determine trend
        # Compare with previous month if exists
        prev_month = month - 1 if month > 1 else 12
        prev_year = year if month > 1 else year - 1
        
        previous_summary = db.query(AttendanceBehaviorSummary).filter(
            AttendanceBehaviorSummary.employee_id == employee_id,
            AttendanceBehaviorSummary.month == prev_month,
            AttendanceBehaviorSummary.year == prev_year
        ).first()
        
        trend = "STABLE"
        if previous_summary:
            if consistency_score > previous_summary.consistency_score + 0.1:
                trend = "IMPROVING"
            elif consistency_score < previous_summary.consistency_score - 0.1:
                trend = "DECLINING"
                
        # 4. Upsert summary
        summary = db.query(AttendanceBehaviorSummary).filter(
            AttendanceBehaviorSummary.employee_id == employee_id,
            AttendanceBehaviorSummary.month == month,
            AttendanceBehaviorSummary.year == year
        ).first()
        
        if not summary:
            summary = AttendanceBehaviorSummary(
                employee_id=employee_id,
                month=month,
                year=year
            )
            db.add(summary)
            
        summary.avg_check_in_hour = avg_check_in
        summary.late_count = total_late
        summary.absent_count = total_absent
        summary.consistency_score = consistency_score
        summary.trend = trend
        
        db.commit()
        db.refresh(summary)
        return summary

    @staticmethod
    def get_behavior_summary(db: Session, employee_id: uuid.UUID, month: int, year: int):
        return db.query(AttendanceBehaviorSummary).filter(
            AttendanceBehaviorSummary.employee_id == employee_id,
            AttendanceBehaviorSummary.month == month,
            AttendanceBehaviorSummary.year == year
        ).first()
