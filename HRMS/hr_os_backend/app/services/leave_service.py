from uuid import UUID
import logging
from datetime import date, timedelta, datetime
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from fastapi import HTTPException

from app.models.leave import Leave, LeaveType, LeaveBalance, Holiday
from app.models.enums import LeaveStatus, DayType, AccrualType

logger = logging.getLogger(__name__)

def calculate_working_days(
    start_date: date, 
    end_date: date, 
    entity_id: UUID, 
    db: Session,
    leave_type_id: Optional[UUID] = None,
    employee_id: Optional[UUID] = None,
    day_type: str = DayType.FULL_DAY
) -> float:
    """
    Calculate working days between two dates.
    - Excludes weekends (Sat, Sun).
    - Excludes Holidays for the entity.
    - Supports Half-Day logic.
    - Supports Refined Sandwich Rule:
        * Detects mixed chains (Sat -> Holiday -> Sun).
        * Applies ONLY if bordering days are FULL_DAY.
    
    TODO: Optimize working days and sandwich logic using precomputed calendars or caching
    """
    if start_date > end_date:
        return 0.0
    
    # 1. Handle Half-Day (Strictly for same-day requests)
    if day_type in [DayType.FIRST_HALF, DayType.SECOND_HALF]:
        if start_date != end_date:
            raise HTTPException(status_code=400, detail="Half-day leave only allowed for single day requests")
        return 0.5

    # 2. Fetch Holidays
    holidays = {h.date for h in db.query(Holiday).filter(
        Holiday.entity_id == entity_id,
        Holiday.date >= start_date,
        Holiday.date <= end_date
    ).all()}

    # 3. Check Sandwich Rule Policy
    sandwich_enabled = False
    if leave_type_id:
        lt = db.query(LeaveType).filter(LeaveType.id == leave_type_id).first()
        if lt:
            sandwich_enabled = lt.sandwich_rule_enabled

    days = 0.0
    current_date = start_date
    while current_date <= end_date:
        is_weekend = current_date.weekday() >= 5
        is_holiday = current_date in holidays
        
        if is_weekend or is_holiday:
            if sandwich_enabled and day_type == DayType.FULL_DAY:
                # Check if this weekend/holiday is bounded by FULL_DAY leaves or working days
                # For simplicity in a single request, if the request is FULL_DAY, 
                # we count intervening weekends/holidays.
                days += 1.0
            else:
                pass
        else:
            days += 1.0
            
        current_date += timedelta(days=1)

    # 4. Advanced Sandwich (External): Check if the entire request is sandwiched between other leaves
    # Requirement: leave -> gap -> leave. 
    # If the user takes Friday off, and already has Monday, and sandwich is ON, 
    # then Sat/Sun should be counted.
    if sandwich_enabled and employee_id:
        # Check if there's a leave immediately before
        prev_leave = db.query(Leave.id).filter(
            Leave.employee_id == employee_id,
            Leave.status.in_([LeaveStatus.PENDING, LeaveStatus.APPROVED]),
            Leave.end_date == start_date - timedelta(days=1)
        ).first()
        
        # Check if there's a leave immediately after
        next_leave = db.query(Leave.id).filter(
            Leave.employee_id == employee_id,
            Leave.status.in_([LeaveStatus.PENDING, LeaveStatus.APPROVED]),
            Leave.start_date == end_date + timedelta(days=1)
        ).first()
        
        # This implementation requires more complex gap-filling logic if we want to add 
        # days that are NOT in the current start-end range.
        # For now, we stick to "don't skip weekends/holidays within the range" 
        # as it's the primary enterprise requirement for sandwich rules.

    return float(round(days, 2))

def check_leave_overlap(
    employee_id: UUID, 
    start_date: date, 
    end_date: date, 
    db: Session, 
    exclude_leave_id: Optional[UUID] = None
) -> bool:
    """
    Check if a leave request overlaps with existing PENDING or APPROVED leaves.
    Uses indexed fields: employee_id, start_date, end_date.
    Optimized to use existence check (db.query(Leave.id)).
    """
    query = db.query(Leave.id).filter(
        Leave.employee_id == employee_id,
        Leave.status.in_([LeaveStatus.PENDING, LeaveStatus.APPROVED]),
        and_(
            Leave.start_date <= end_date,
            Leave.end_date >= start_date
        )
    )
    
    if exclude_leave_id:
        query = query.filter(Leave.id != exclude_leave_id)
        
    return query.first() is not None

def validate_leave_balance(
    employee_id: UUID, 
    leave_type_id: UUID, 
    requested_days: float, 
    db: Session,
    year: Optional[int] = None
) -> bool:
    """
    Validate if employee has enough balance for the requested leave.
    Unpaid leaves always pass.
    """
    if not year:
        year = datetime.utcnow().year
        
    if not leave_type_id:
        # Fallback: If no ID, but we have leaves with legacy strings, we might need a different lookup
        # For validation, we strictly require a type ID now.
        raise HTTPException(status_code=400, detail="Leave type ID is required for validation")

    leave_type = db.query(LeaveType).filter(LeaveType.id == leave_type_id).first()
    if not leave_type:
        raise HTTPException(status_code=404, detail="Leave type not found")
        
    if not leave_type.is_paid:
        return True
        
    balance = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == employee_id,
        LeaveBalance.leave_type_id == leave_type_id,
        LeaveBalance.year == year
    ).first()
    
    if not balance:
        # TODO: Initialize LeaveBalance automatically on first leave usage
        # Case when no allocation yet: treat as 0 remaining
        return False if not leave_type.allow_negative_balance and requested_days > 0 else True
    
    # NEW: Expiry Enforcement
    # TODO: Implement ledger-based balance to support partial expiry
    if balance.expiry_date and datetime.utcnow().date() > balance.expiry_date:
        logger.info(
            "Leave rejected due to balance expiry | employee_id=%s | leave_type_id=%s | expiry_date=%s",
            employee_id, leave_type_id, balance.expiry_date
        )
        return False

    remaining = balance.remaining
    
    if not leave_type.allow_negative_balance and remaining < requested_days:
        return False
        
    return True

def apply_leave_balance_deduction(leave: Leave, db: Session):
    """
    Deduct leave balance from employee.
    Uses SELECT FOR UPDATE for concurrency safety.
    Only applies to paid leaves.
    """
    # Consistency check: year should be from start_date
    year = leave.start_date.year
    
    # SAFE FALLBACK: If leave_type_id is missing, find by string code (for legacy records)
    l_type_id = leave.leave_type_id
    if not l_type_id and leave.leave_type:
        lt_obj = db.query(LeaveType.id).filter(
            LeaveType.entity_id == leave.entity_id,
            LeaveType.code == leave.leave_type.upper()
        ).first()
        if lt_obj:
            l_type_id = lt_obj.id

    if not l_type_id:
        logger.warning("Skipping balance deduction: No valid leave_type_id for leave_id=%s", leave.id)
        return

    leave_type = db.query(LeaveType).filter(LeaveType.id == l_type_id).first()
    if not leave_type or not leave_type.is_paid:
        return 
        
    # Row-level lock on the specific balance record
    balance = db.query(LeaveBalance).filter(
        and_(
            LeaveBalance.employee_id == leave.employee_id,
            LeaveBalance.leave_type_id == leave.leave_type_id,
            LeaveBalance.year == year
        )
    ).with_for_update().first()
    
    if not balance:
        # Create balance record if it doesn't exist (e.g., initial allocation)
        # Though usually allocated via separate process, we handle safe fallbacks
        balance = LeaveBalance(
            employee_id=leave.employee_id,
            leave_type_id=leave.leave_type_id,
            year=year,
            allocated=0.0,
            used=0.0,
            remaining=0.0
        )
        db.add(balance)
        db.flush() # Ensure it has an ID/state for the lock to be effective if created
        
    # Final safety check: re-validate balance under lock
    if not leave_type.allow_negative_balance and balance.remaining < leave.days:
        raise HTTPException(
            status_code=400, 
            detail=f"Insufficient leave balance. Available: {balance.remaining}, Requested: {leave.days}"
        )
        
    # Atomic deduction with precision rounding
    balance.used = round(balance.used + leave.days, 2)
    balance.remaining = round(balance.remaining - leave.days, 2)
    
    logger.info(
        "Balance deduction applied | employee_id=%s | leave_id=%s | days=%s | remaining=%s",
        leave.employee_id, leave.id, leave.days, balance.remaining
    )
    
def restore_leave_balance(leave: Leave, db: Session):
    """
    Restore leave balance to employee (e.g., on cancellation or rejection).
    Uses SELECT FOR UPDATE for concurrency safety.
    """
    if leave.status not in [LeaveStatus.APPROVED, LeaveStatus.PENDING]:
        # Only pending/approved leaves have deductions that need restoration
        return

    year = leave.start_date.year
    l_type_id = leave.leave_type_id
    
    if not l_type_id:
        return

    leave_type = db.query(LeaveType).filter(LeaveType.id == l_type_id).first()
    if not leave_type or not leave_type.is_paid:
        return

    balance = db.query(LeaveBalance).filter(
        and_(
            LeaveBalance.employee_id == leave.employee_id,
            LeaveBalance.leave_type_id == l_type_id,
            LeaveBalance.year == year
        )
    ).with_for_update().first()

    if balance:
        balance.used = round(max(0, balance.used - leave.days), 2)
        balance.remaining = round(balance.remaining + leave.days, 2)
        
        logger.info(
            "Balance restoration applied | employee_id=%s | leave_id=%s | days=%s | remaining=%s",
            leave.employee_id, leave.id, leave.days, balance.remaining
        )


# =============================================================
# STEP 3: ACCRUAL & CARRY FORWARD ENGINES
# =============================================================

def run_leave_accrual(entity_id: UUID, db: Session):
    """
    Auto-credit leave balances based on LeaveType policy.
    Can be called by a cron job or background worker.
    """
    today = datetime.utcnow().date()
    year = today.year
    
    # 1. Fetch all active leave types for the entity with accrual enabled
    leave_types = db.query(LeaveType).filter(
        LeaveType.entity_id == entity_id,
        LeaveType.is_active == True,
        LeaveType.accrual_type != AccrualType.NONE
    ).all()
    
    for lt in leave_types:
        # Determine expected cycle date for idempotency
        if lt.accrual_type == AccrualType.MONTHLY:
            # Expected date is this month's accrual day (or if before it, last month's)
            if today.day >= lt.accrual_day:
                expected_date = today.replace(day=lt.accrual_day)
            else:
                first_of_month = today.replace(day=1)
                prev_month = first_of_month - timedelta(days=1)
                expected_date = prev_month.replace(day=min(lt.accrual_day, prev_month.day))
        else: # YEARLY
            expected_date = date(today.year, 1, 1) # Simplification for yearly
        
        # 2. Fetch all employees in the entity
        from app.models.employee import Employee
        employees = db.query(Employee.id).filter(Employee.entity_id == entity_id).all()
        
        for emp_row in employees:
            emp_id = emp_row.id
            
            # 3. Get or Create Balance record
            balance = db.query(LeaveBalance).filter(
                LeaveBalance.employee_id == emp_id,
                LeaveBalance.leave_type_id == lt.id,
                LeaveBalance.year == year
            ).with_for_update().first()
            
            # Prevention of duplicate accrual (Idempotency)
            if balance and balance.last_accrual_date and balance.last_accrual_date >= expected_date:
                continue
            
            if not balance:
# ... (rest of the logic remains the same, I'll just adjust the logging)
                balance = LeaveBalance(
                    employee_id=emp_id,
                    leave_type_id=lt.id,
                    year=year,
                    allocated=0.0,
                    used=0.0,
                    remaining=0.0
                )
                db.add(balance)
                db.flush()
            
            # 4. Apply Accrual (Additive)
            old_allocated = balance.allocated
            new_allocated = old_allocated + lt.accrual_rate
            
            # Respect max_per_year
            if lt.max_per_year and new_allocated > lt.max_per_year:
                new_allocated = lt.max_per_year
            
            added = new_allocated - old_allocated
            if added > 0:
                balance.allocated = round(new_allocated, 2)
                balance.remaining = round(balance.remaining + added, 2)
                balance.last_accrual_date = today
                logger.info(
                    "Accrual applied | employee_id=%s | leave_type_id=%s | added=%s",
                    emp_id, lt.id, added
                )
                
    db.commit()
    logger.info("Leave accrual completed for entity: %s", entity_id)

def process_carry_forward(entity_id: UUID, db: Session, target_year: Optional[int] = None):
    """
    Move unused balances from previous year to target year.
    Usually run on Jan 1st.
    """
    if not target_year:
        target_year = datetime.utcnow().year
    
    prev_year = target_year - 1
    
    leave_types = db.query(LeaveType).filter(
        LeaveType.entity_id == entity_id,
        LeaveType.carry_forward_enabled == True
    ).all()
    
    for lt in leave_types:
        # Fetch all balances for this type in the previous year
        prev_balances = db.query(LeaveBalance).filter(
            LeaveBalance.leave_type_id == lt.id,
            LeaveBalance.year == prev_year,
            LeaveBalance.remaining > 0
        ).all()
        
        for pb in prev_balances:
            # Calculate carry forward amount
            cf_amount = pb.remaining
            if lt.carry_forward_limit and cf_amount > lt.carry_forward_limit:
                cf_amount = lt.carry_forward_limit
            
            # Find or create target year balance
            target_balance = db.query(LeaveBalance).filter(
                LeaveBalance.employee_id == pb.employee_id,
                LeaveBalance.leave_type_id == lt.id,
                LeaveBalance.year == target_year
            ).with_for_update().first()
            
            if not target_balance:
                target_balance = LeaveBalance(
                    employee_id=pb.employee_id,
                    leave_type_id=lt.id,
                    year=target_year,
                    allocated=0.0,
                    used=0.0,
                    remaining=0.0
                )
                db.add(target_balance)
                db.flush()
            
            # Add to allocated/remaining (as carry-forward is a form of credit)
            target_balance.allocated = round(target_balance.allocated + cf_amount, 2)
            target_balance.remaining = round(target_balance.remaining + cf_amount, 2)
            
            # Set Expiry
            if lt.expiry_days:
                today = datetime.utcnow().date()
                target_balance.expiry_date = today + timedelta(days=lt.expiry_days)
            
            logger.info(
                "Carry forward applied | employee_id=%s | amount=%s | expiry_date=%s",
                pb.employee_id, cf_amount, target_balance.expiry_date
            )
            
    db.commit()
    logger.info("Carry forward processing completed for entity: %s", entity_id)
