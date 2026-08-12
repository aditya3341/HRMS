import uuid
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.performance import EmployeeGoal, GoalItem, PerformanceCycle
from app.models.employee import Employee
from app.models.enums import GoalStatus, AuditAction
from app.schemas.performance import EmployeeGoalCreate, GoalItemCreate
from app.services.performance_service import PerformanceService
from app.utils.audit import log_audit

class GoalService:
    @staticmethod
    def get_user_goals(db: Session, employee_id: uuid.UUID, cycle_id: uuid.UUID) -> Optional[EmployeeGoal]:
        return db.query(EmployeeGoal).filter(
            EmployeeGoal.employee_id == employee_id,
            EmployeeGoal.cycle_id == cycle_id
        ).first()

    @staticmethod
    def create_or_update_goals(
        db: Session, 
        employee_id: uuid.UUID, 
        goal_data: EmployeeGoalCreate, 
        current_user: dict
    ) -> EmployeeGoal:
        # 1. Fetch Cycle & Config
        cycle = db.query(PerformanceCycle).filter(PerformanceCycle.id == goal_data.cycle_id).first()
        if not cycle:
            raise HTTPException(status_code=404, detail="Performance cycle not found")
        
        config = PerformanceService.get_config_value(db, "GOAL_SETTINGS_CONFIG", cycle.id)
        if not config:
            raise HTTPException(status_code=500, detail="Goal settings configuration not found")

        # 2. Check if goals already exist and are locked
        existing_goal = db.query(EmployeeGoal).filter(
            EmployeeGoal.employee_id == employee_id,
            EmployeeGoal.cycle_id == goal_data.cycle_id
        ).first()

        if existing_goal:
            if existing_goal.status in [GoalStatus.SUBMITTED, GoalStatus.APPROVED] and not config.get("allow_edit_after_submit", False):
                raise HTTPException(status_code=400, detail="Goals are locked and cannot be edited")
            # Clear existing items for update
            for item in existing_goal.items:
                db.delete(item)
            goal_obj = existing_goal
        else:
            # Get employee's manager
            emp = db.query(Employee).filter(Employee.id == employee_id).first()
            if not emp or not emp.manager_id:
                raise HTTPException(status_code=400, detail="Employee or Reporting Manager not found")
            
            goal_obj = EmployeeGoal(
                id=uuid.uuid4(),
                employee_id=employee_id,
                manager_id=emp.manager_id,
                cycle_id=goal_data.cycle_id,
                status=GoalStatus.DRAFT
            )
            db.add(goal_obj)

        # 3. Validate Goal Count
        goal_count = len(goal_data.items)
        if goal_count < config.get("min_goals", 0):
            raise HTTPException(status_code=400, detail=f"Minimum {config['min_goals']} goals required")
        if goal_count > config.get("max_goals", 99):
            raise HTTPException(status_code=400, detail=f"Maximum {config['max_goals']} goals allowed")

        # 4. Add Items & Calculate Total Weightage
        total_weight = 0.0
        for item_data in goal_data.items:
            # Mandatory Field Check (Custom validation based on config)
            for field in config.get("mandatory_fields", []):
                if not getattr(item_data, field, None):
                    raise HTTPException(status_code=400, detail=f"Field '{field}' is mandatory for all goals")

            item = GoalItem(
                id=uuid.uuid4(),
                goal_id=goal_obj.id,
                kpa_id=item_data.kpa_id,
                kra_id=item_data.kra_id,
                title=item_data.title,
                description=item_data.description,
                weightage=item_data.weightage,
                target_value=item_data.target_value,
                is_custom=item_data.is_custom
            )
            total_weight += item_data.weightage
            db.add(item)

        # 5. Validate Weightage
        target_total = config.get("weightage_total", 100)
        tolerance = config.get("weightage_tolerance", 0)
        
        if abs(total_weight - target_total) > tolerance:
            raise HTTPException(
                status_code=400, 
                detail=f"Total weightage must be {target_total}% (Current: {total_weight}%)"
            )

        goal_obj.total_weightage = total_weight
        db.commit()
        db.refresh(goal_obj)
        return goal_obj

    @staticmethod
    def submit_goals(db: Session, goal_id: uuid.UUID, current_user: dict) -> EmployeeGoal:
        goal = db.query(EmployeeGoal).filter(EmployeeGoal.id == goal_id).first()
        if not goal:
            raise HTTPException(status_code=404, detail="Goals not found")
        
        if goal.status != GoalStatus.DRAFT:
            raise HTTPException(status_code=400, detail="Only DRAFT goals can be submitted")
        
        goal.status = GoalStatus.SUBMITTED
        
        log_audit(
            db=db,
            user=current_user,
            action=AuditAction.GOALS_SUBMITTED,
            module="PERFORMANCE",
            resource_type="EmployeeGoal",
            resource_id=str(goal.id)
        )
        
        db.commit()
        return goal

    @staticmethod
    def approve_goals(db: Session, goal_id: uuid.UUID, current_user: dict) -> EmployeeGoal:
        goal = db.query(EmployeeGoal).filter(EmployeeGoal.id == goal_id).first()
        if not goal:
            raise HTTPException(status_code=404, detail="Goals not found")
        
        # Security: Only manager can approve
        if str(goal.manager_id) != current_user["employee_id"] and current_user["role"] not in ["SUPER_ADMIN", "HR_ADMIN"]:
             raise HTTPException(status_code=403, detail="Only the reporting manager can approve goals")

        if goal.status != GoalStatus.SUBMITTED:
            raise HTTPException(status_code=400, detail="Goals must be in SUBMITTED status to be approved")
        
        goal.status = GoalStatus.APPROVED
        
        log_audit(
            db=db,
            user=current_user,
            action=AuditAction.GOALS_APPROVED,
            module="PERFORMANCE",
            resource_type="EmployeeGoal",
            resource_id=str(goal.id)
        )
        
        db.commit()
        return goal
