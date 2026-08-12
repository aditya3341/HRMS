from uuid import UUID
from typing import List, Optional
from datetime import datetime, timezone, timedelta

from sqlalchemy import or_, func
from sqlalchemy.orm import Session

from app.models.approval import (
    ApprovalConfig,
    ApprovalConfigStep,
    ApprovalRequest,
    ApprovalStep,
    ApprovalModule,
    ApproverType,
    ApprovalStatus,
    ApprovalMode
)
from app.models.employee import Employee
from app.models.user import User
from app.services.approval_triggers import trigger_post_approval
from app.services.approval_notifications import notify_approver

class ApprovalException(Exception):
    pass


def _compute_sla(
    step_created_at: datetime,
    escalation_hours: Optional[int],
    escalated_at: Optional[datetime],
) -> dict:
    """
    Returns a dict matching SlaInfo schema:
      { "status": str, "hours_left": float | None }
    """
    if not escalation_hours:
        return {"status": "NONE", "hours_left": None}

    now = datetime.now(timezone.utc)
    created = step_created_at if step_created_at.tzinfo else step_created_at.replace(tzinfo=timezone.utc)
    deadline = created.timestamp() + escalation_hours * 3600
    hours_left = (deadline - now.timestamp()) / 3600

    if escalated_at:
        return {"status": "ESCALATED", "hours_left": round(hours_left, 2)}
    elif hours_left < 0:
        return {"status": "OVERDUE", "hours_left": round(hours_left, 2)}
    elif hours_left <= 2:
        return {"status": "DUE_SOON", "hours_left": round(hours_left, 2)}
    else:
        return {"status": "SAFE", "hours_left": round(hours_left, 2)}


def _enrich_sla_for_requests(db: Session, requests: List["ApprovalRequest"]) -> None:
    """
    Bulk-attaches `.sla` dicts to each ApprovalRequest in-place.
    Joins active ApprovalStep → ApprovalConfigStep for escalation_hours.
    Single query for the entire batch to avoid N+1.
    """
    if not requests:
        return

    request_ids = [r.id for r in requests]

    # Subquery: min pending step_order per request
    subq = (
        db.query(
            ApprovalStep.approval_request_id,
            func.min(ApprovalStep.step_order).label("min_step"),
        )
        .filter(
            ApprovalStep.approval_request_id.in_(request_ids),
            ApprovalStep.status == ApprovalStatus.PENDING.value,
        )
        .group_by(ApprovalStep.approval_request_id)
        .subquery()
    )

    # Fetch the active steps with their linked config steps
    rows = (
        db.query(ApprovalStep, ApprovalConfigStep)
        .join(
            subq,
            (ApprovalStep.approval_request_id == subq.c.approval_request_id)
            & (ApprovalStep.step_order == subq.c.min_step),
        )
        .outerjoin(
            ApprovalConfigStep,
            (ApprovalConfigStep.step_order == ApprovalStep.step_order)
            & (
                ApprovalConfigStep.config_id.in_(
                    db.query(ApprovalConfig.id).filter(
                        ApprovalConfig.entity_id.in_(
                            db.query(ApprovalRequest.entity_id).filter(
                                ApprovalRequest.id.in_(request_ids)
                            )
                        )
                    )
                )
            ),
        )
        .filter(ApprovalStep.approval_request_id.in_(request_ids))
        .all()
    )

    # Build lookup: request_id → (step, config_step)
    sla_lookup: dict = {}
    for step, cfg_step in rows:
        rid = step.approval_request_id
        if rid not in sla_lookup:
            sla_lookup[rid] = (step, cfg_step)

    for req in requests:
        pair = sla_lookup.get(req.id)
        if pair:
            active_step, cfg_step = pair
            escalation_hours = cfg_step.escalation_hours if cfg_step else None
            req.sla = _compute_sla(
                active_step.created_at,
                escalation_hours,
                active_step.escalated_at,
            )
        else:
            # Request is fully resolved or has no pending steps
            req.sla = {"status": "NONE", "hours_left": None}

def _enrich_total_steps_for_requests(db: Session, requests: List["ApprovalRequest"]) -> None:
    if not requests:
        return
        
    config_counts = {}
    for req in requests:
        key = (req.module, req.entity_id)
        if key not in config_counts:
            max_step = db.query(func.max(ApprovalConfigStep.step_order)).join(
                ApprovalConfig, ApprovalConfig.id == ApprovalConfigStep.config_id
            ).filter(
                ApprovalConfig.module == req.module,
                ApprovalConfig.entity_id == req.entity_id
            ).scalar()
            config_counts[key] = max_step or req.current_step
            
        req.total_steps = config_counts[key]

def resolve_approvers_for_step(
    db: Session,
    step: ApprovalConfigStep,
    requester_user_id: UUID,
    entity_id: UUID | None = None,
) -> List[UUID]:
    """
    Resolves a step configuration into a list of employee UUIDs.
    entity_id is required for ROLE-based resolution to enforce multi-tenancy.
    """
    if step.approver_type == ApproverType.MANAGER.value:
        requester_employee = db.query(Employee).filter(Employee.user_id == requester_user_id).first()
        if not requester_employee:
            raise ApprovalException("Requester is not an active employee")
        
        if requester_employee.manager_id:
            return [requester_employee.manager_id]  # already employee.id ✅
            
        if step.is_mandatory:
            raise ApprovalException(f"Manager not assigned for requester {requester_employee.id}")
            
        return []

    elif step.approver_type == ApproverType.ROLE.value:
        # Case-insensitive role match + multi-tenant entity_id filter
        role_filter = func.lower(User.role) == step.approver_value.lower()
        query = (
            db.query(Employee)
            .join(User, Employee.user_id == User.id)
            .filter(role_filter)
        )
        if entity_id is not None:
            query = query.filter(Employee.entity_id == entity_id)

        employees_with_role = query.all()
        if not employees_with_role:
            if step.is_mandatory:
                raise ApprovalException(f"No employees found with role '{step.approver_value}'")
            return []
            
        return [emp.id for emp in employees_with_role]

    elif step.approver_type == ApproverType.SPECIFIC_EMPLOYEE.value:
        if not step.approver_value:
            if step.is_mandatory:
                raise ApprovalException("No employee specified for SPECIFIC_EMPLOYEE step")
            return []
            
        try:
            emp_id = UUID(step.approver_value)
            emp = db.query(Employee).filter(Employee.id == emp_id).first()
            if not emp:
                if step.is_mandatory:
                    raise ApprovalException(f"Specific employee {emp_id} not found")
                return []
            return [emp_id]
        except ValueError:
            if step.is_mandatory:
                raise ApprovalException("Invalid UUID format for SPECIFIC_EMPLOYEE")
            return []
            
    return []


def create_approval_request(
    db: Session, 
    module: str, 
    reference_id_str: str, 
    entity_id: UUID, 
    user_id: UUID
) -> ApprovalRequest:
    
    config = db.query(ApprovalConfig).filter(
        ApprovalConfig.module == module,
        ApprovalConfig.entity_id == entity_id,
        ApprovalConfig.is_active == True
    ).first()
    
    if not config:
        raise ApprovalException(f"No active approval config found for module {module}")
        
    steps = sorted(config.steps, key=lambda s: s.step_order)
    if not steps:
        raise ApprovalException(f"Approval config {config.id} has no steps")
        
    # Check if there are any approvers for any step
    # Wait, we evaluate everything at creation to freeze the workflow
    approval_request = ApprovalRequest(
        entity_id=entity_id,
        module=module,
        reference_id_str=reference_id_str,
        requested_by=user_id,
        status=ApprovalStatus.PENDING.value,
        current_step=steps[0].step_order
    )
    db.add(approval_request)
    db.flush()
    
    any_step_added = False
    
    for step_cfg in steps:
        approvers = resolve_approvers_for_step(db, step_cfg, user_id, entity_id=entity_id)
        
        # 4. SAFETY CHECK (VERY IMPORTANT)
        if not approvers:
            if step_cfg.is_mandatory:
                raise ApprovalException(f"No valid employee approvers found for step {step_cfg.step_order}")
                
            # FIX 6: Auditable Step Skipping
            new_step = ApprovalStep(
                approval_request_id=approval_request.id,
                step_order=step_cfg.step_order,
                approver_id=None,
                status=ApprovalStatus.IGNORED.value,
                remarks="Auto-skipped: No valid approver found"
            )
            db.add(new_step)
            continue
            
        # 5. ADD DEBUG LOG
        print("Resolved approvers:", approvers)
        
        # 6. VALIDATION GUARD
        for emp_id in approvers:
            exists = db.query(Employee).filter(Employee.id == emp_id).first()
            if not exists:
                raise ApprovalException(f"Invalid approver_id: {emp_id}")

            new_step = ApprovalStep(
                approval_request_id=approval_request.id,
                step_order=step_cfg.step_order,
                approver_id=emp_id,
                status=ApprovalStatus.PENDING.value
            )
            db.add(new_step)
            
        any_step_added = True
        break
        
    db.commit()
    db.refresh(approval_request)
    
    # Notify initial approvers
    # Find the lowest step order that is PENDING
    active_steps = db.query(ApprovalStep).filter(
        ApprovalStep.approval_request_id == approval_request.id,
        ApprovalStep.status == ApprovalStatus.PENDING.value
    ).all()
    
    if active_steps:
        min_step = min(s.step_order for s in active_steps)
        for s in active_steps:
            if s.step_order == min_step and s.approver_id:
                notify_approver(str(s.approver_id), str(approval_request.id), db)
    elif not any_step_added:
        # If all steps were skipped, auto-approve
        approval_request.status = ApprovalStatus.APPROVED.value
        db.commit()
        trigger_post_approval(module, reference_id_str, db)

    return approval_request


def take_action(
    db: Session, 
    approval_request_id: UUID, 
    approver_ids: List[UUID], 
    action: str, 
    remarks: Optional[str],
    is_admin_override: bool = False
):
    """
    Handles APPROVE or REJECT for a given approval request by an employee.
    """
    request = db.query(ApprovalRequest).filter(ApprovalRequest.id == approval_request_id).first()
    if not request:
        raise ApprovalException("Approval request not found")
        
    if request.status != ApprovalStatus.PENDING.value:
        print(f"DEBUG: Request {approval_request_id} is not PENDING, status is {request.status}")
        raise ApprovalException(f"Approval request is already {request.status}")

    # FIX 2: Derive active step dynamically (Removes dependency on request.current_step)
    active_steps = db.query(ApprovalStep).filter(
        ApprovalStep.approval_request_id == request.id,
        ApprovalStep.status == ApprovalStatus.PENDING.value
    ).all()
    
    if not active_steps:
        raise ApprovalException("No pending steps left for this request")
        
    current_step_order = min(s.step_order for s in active_steps)
    
    my_step_candidate = next((s for s in active_steps if s.approver_id in approver_ids and s.step_order == current_step_order), None)
    
    if not my_step_candidate:
        if is_admin_override:
            # Pick any pending step in this order to "act on behalf of"
            my_step_candidate = active_steps[0]
            print(f"DEBUG: Admin override used for step {current_step_order}")
        else:
            print(f"DEBUG: Authorization failed. User IDs {approver_ids} not in pending step approvers.")
            raise ApprovalException(f"You ({approver_ids}) are not authorized to approve this step ({current_step_order}) or it's not your turn")
        
    # FIX 1: Concurrency Control - Strict Root Transaction wrapper
    # Using `with db.begin():` encapsulates everything safely. 
    # Any exception will automatically rollback the entire nested process.
    try:
        # Check if already in transaction (e.g. implicitly by first query)
        # Use begin_nested() for savepoint if needed, or simply let the session manage it
        # and we call commit() ourselves at the end.
        
        my_step = (
            db.query(ApprovalStep)
            .filter(ApprovalStep.id == my_step_candidate.id)
            .with_for_update()
            .first()
        )
        if my_step.status != ApprovalStatus.PENDING.value:
            raise Exception("This approval step has already been processed")

        config = db.query(ApprovalConfig).join(ApprovalConfigStep, ApprovalConfig.id == ApprovalConfigStep.config_id).filter(
            ApprovalConfig.module == request.module,
            ApprovalConfig.entity_id == request.entity_id,
            ApprovalConfigStep.step_order == current_step_order
        ).first()
        
        # Get config for this step
        step_cfg = next((s for s in config.steps if s.step_order == current_step_order), None) if config else None
        approval_mode = step_cfg.approval_mode if step_cfg else ApprovalMode.ALL.value

        # Process Action
        my_step.status = action
        my_step.action_at = datetime.now(timezone.utc)
        my_step.remarks = remarks
        
        db.flush()

        if action == ApprovalStatus.REJECTED.value:
            request.status = ApprovalStatus.REJECTED.value
            for other_step in active_steps:
                if other_step.id != my_step.id and other_step.status == ApprovalStatus.PENDING.value and other_step.step_order == current_step_order:
                    lock_other = db.query(ApprovalStep).filter(ApprovalStep.id == other_step.id).with_for_update().first()
                    if lock_other and lock_other.status == ApprovalStatus.PENDING.value:
                        lock_other.status = ApprovalStatus.IGNORED.value
                        lock_other.remarks = "Auto-ignored due to REJECTION"
                        
        elif action == ApprovalStatus.APPROVED.value:
            if approval_mode == ApprovalMode.ANY.value:
                # FIX 3: IGNORED STATUS for remaining parallel steps
                for other_step in active_steps:
                    if other_step.id != my_step.id and other_step.status == ApprovalStatus.PENDING.value and other_step.step_order == current_step_order:
                        lock_other = db.query(ApprovalStep).filter(ApprovalStep.id == other_step.id).with_for_update().first()
                        if lock_other and lock_other.status == ApprovalStatus.PENDING.value:
                            lock_other.status = ApprovalStatus.IGNORED.value
                            lock_other.remarks = "Auto-ignored due to ANY approval mode"
                step_completed = True
            else:
                # Mode ALL - check if any pending remains
                still_pending = any(s.status == ApprovalStatus.PENDING.value and s.id != my_step.id and s.step_order == current_step_order for s in active_steps)
                step_completed = not still_pending                
            if step_completed:
                config = db.query(ApprovalConfig).join(ApprovalConfigStep, ApprovalConfig.id == ApprovalConfigStep.config_id).filter(
                    ApprovalConfig.module == request.module,
                    ApprovalConfig.entity_id == request.entity_id
                ).first()
                
                next_steps = [s for s in config.steps if s.step_order > current_step_order]
                next_steps.sort(key=lambda s: s.step_order)
                
                next_active_step_created = False
                next_step_order = None
                
                for step_cfg in next_steps:
                    approvers = resolve_approvers_for_step(db, step_cfg, request.requested_by, entity_id=request.entity_id)
                    
                    if not approvers:
                        if step_cfg.is_mandatory:
                            raise ApprovalException(f"Workflow stalled: No valid employee approvers found for mandatory step {step_cfg.step_order}")
                        
                        new_step = ApprovalStep(
                            approval_request_id=request.id,
                            step_order=step_cfg.step_order,
                            approver_id=None,
                            status=ApprovalStatus.IGNORED.value,
                            remarks="Auto-skipped: No valid approver found"
                        )
                        db.add(new_step)
                        continue
                        
                    print("Moving to next step:", step_cfg.step_order)
                    print("Resolved approvers:", approvers)
                    
                    for emp_id in approvers:
                        exists = db.query(Employee).filter(Employee.id == emp_id).first()
                        if not exists:
                            raise ApprovalException(f"Invalid approver_id: {emp_id}")

                        new_step = ApprovalStep(
                            approval_request_id=request.id,
                            step_order=step_cfg.step_order,
                            approver_id=emp_id,
                            status=ApprovalStatus.PENDING.value
                        )
                        db.add(new_step)
                        
                    next_active_step_created = True
                    next_step_order = step_cfg.step_order
                    request.current_step = next_step_order
                    db.flush()
                    
                    active_new_steps = db.query(ApprovalStep).filter(
                        ApprovalStep.approval_request_id == request.id,
                        ApprovalStep.step_order == next_step_order,
                        ApprovalStep.status == ApprovalStatus.PENDING.value
                    ).all()
                    for s in active_new_steps:
                        if s.approver_id:
                            notify_approver(str(s.approver_id), str(request.id), str(s.id), db)
                    
                    break  # Only create one active step level at a time
                    
                if not next_active_step_created:
                    print("Approval completed")
                    request.status = ApprovalStatus.APPROVED.value
                    db.flush()
                    trigger_post_approval(request.module, request.reference_id_str, db)
        
        db.commit() # FINAL COMMIT
    except Exception as e:
        db.rollback() # ROLLBACK ON ERROR
        print(f"DEBUG: Internal transaction failure: {str(e)}")
        raise ApprovalException(f"Transaction failed: {str(e)}")
        
    db.refresh(request)
    return request

def get_my_approvals(db: Session, approver_ids: List[UUID]) -> List[ApprovalRequest]:
    """
    Returns pending approvals where the employee is an active approver on the current dynamically derived step
    """
    subq = (
        db.query(ApprovalStep.approval_request_id, func.min(ApprovalStep.step_order).label("min_step"))
        .filter(ApprovalStep.status == ApprovalStatus.PENDING.value)
        .group_by(ApprovalStep.approval_request_id)
        .subquery()
    )
    
    requests = (
        db.query(ApprovalRequest)
        .join(ApprovalStep, ApprovalRequest.id == ApprovalStep.approval_request_id)
        .join(subq, (ApprovalStep.approval_request_id == subq.c.approval_request_id) & (ApprovalStep.step_order == subq.c.min_step))
        .filter(
            ApprovalRequest.status == ApprovalStatus.PENDING.value,
            ApprovalStep.status == ApprovalStatus.PENDING.value,
            ApprovalStep.approver_id.in_(approver_ids)
        )
        .all()
    )
    
    # Enrich requester names
    requester_ids = list(set([req.requested_by for req in requests]))
    if requester_ids:
        # Resolve names from User model (joining with Employee if possible for full name)
        from app.models.user import User
        users = (
            db.query(User.id, Employee.full_name)
            .outerjoin(Employee, User.id == Employee.user_id)
            .filter(User.id.in_(requester_ids))
            .all()
        )
        user_name_lookup = {str(uid): (name or "System") for uid, name in users}
        for req in requests:
            req.requested_by_name = user_name_lookup.get(str(req.requested_by), "Unknown")

    # IMPROVEMENT 3: Enrich Response with context using batch queries avoiding N+1
    offer_lookup = {}
    onboarding_lookup = {}
    
    for req in requests:
        if req.module == ApprovalModule.OFFER.value:
            offer_lookup[req.reference_id_str] = req
        elif req.module == ApprovalModule.ONBOARDING.value:
            onboarding_lookup[req.reference_id_str] = req
            
    if offer_lookup:
        from app.models.offer import Offer
        from app.models.application import Application
        offers = (
            db.query(Offer, Application)
            .join(Application, Offer.application_id == Application.id)
            .filter(Offer.id.in_(offer_lookup.keys()))
            .all()
        )
        for off, app in offers:
            ref_id_str = str(off.id)
            if ref_id_str in offer_lookup:
                offer_lookup[ref_id_str].reference = {
                    "title": f"{app.candidate_name}",
                    "subtitle": f"Role: {off.designation}",
                    "meta": {
                        "salary": f"Salary: {off.offered_salary}" if off.offered_salary else ""
                    }
                }
                
    if onboarding_lookup:
        from app.models.employee import Employee
        # We named the import `Employee_Model` internally using existing imports if needed
        # but the module scope `Employee` is already imported at top of approval_service.py
        emps = db.query(Employee).filter(Employee.id.in_(onboarding_lookup.keys())).all()
        for emp in emps:
            ref_id_str = str(emp.id)
            if ref_id_str in onboarding_lookup:
                onboarding_lookup[ref_id_str].reference = {
                    "title": emp.full_name,
                    "subtitle": f"Email: {emp.email}",
                    "meta": {
                        "employee_code": f"ID: {emp.employee_code}" if emp.employee_code else "",
                        "status": f"Status: {emp.status}"
                    }
                }

    _enrich_sla_for_requests(db, requests)
    _enrich_total_steps_for_requests(db, requests)
    
    # Map priority based on SLA
    for req in requests:
        if hasattr(req, 'sla'):
            req.priority = _map_sla_to_priority(req.sla.get("status", "NONE"))
            
    return requests


def _map_sla_to_priority(sla_status: str) -> str:
    if sla_status in ("OVERDUE", "ESCALATED"):
        return "HIGH"
    if sla_status == "DUE_SOON":
        return "MEDIUM"
    return "LOW"


def get_action_center_data(db: Session, approver_ids: List[UUID], entity_id: UUID) -> dict:
    """
    Aggregated data for the Action Center:
    - Pending approvals (assigned to user)
    - Summary counts
    - Recent activity (all actions in entity)
    """
    # 1. Pending Approvals
    pending = get_my_approvals(db, approver_ids)
    
    # 2. Summary
    # Count totals by module for the user's pending items
    total_pending = len(pending)
    offers = len([r for r in pending if r.module == ApprovalModule.OFFER.value])
    onboarding = len([r for r in pending if r.module == ApprovalModule.ONBOARDING.value])
    
    summary = {
        "total_pending": total_pending,
        "offers": offers,
        "onboarding": onboarding
    }
    
    # 3. Recent Activity
    # Fetch last 10 steps that were APPROVED or REJECTED in this entity
    recent_steps = (
        db.query(ApprovalStep, ApprovalRequest)
        .join(ApprovalRequest, ApprovalStep.approval_request_id == ApprovalRequest.id)
        .filter(
            ApprovalRequest.entity_id == entity_id,
            ApprovalStep.status.in_([ApprovalStatus.APPROVED.value, ApprovalStatus.REJECTED.value])
        )
        .order_by(ApprovalStep.action_at.desc())
        .limit(10)
        .all()
    )
    
    # Enrichment for activity names
    # We can reuse the lookup logic from get_my_approvals if we want more detail,
    # but for activity feed, we just need basic name/action.
    recent_activity = []
    
    # Batch resolve names for activity
    offer_ids = [str(r.reference_id_str) for s, r in recent_steps if r.module == ApprovalModule.OFFER.value]
    emp_ids = [str(r.reference_id_str) for s, r in recent_steps if r.module == ApprovalModule.ONBOARDING.value]
    
    name_lookup = {}
    if offer_ids:
        from app.models.offer import Offer
        from app.models.application import Application
        offers = db.query(Offer.id, Application.candidate_name).join(Application, Offer.application_id == Application.id).filter(Offer.id.in_(offer_ids)).all()
        for oid, name in offers:
            name_lookup[str(oid)] = name
            
    if emp_ids:
        from app.models.employee import Employee
        emps = db.query(Employee.id, Employee.full_name).filter(Employee.id.in_(emp_ids)).all()
        for eid, name in emps:
            name_lookup[str(eid)] = name

    for step, req in recent_steps:
        recent_activity.append({
            "id": step.id,
            "action": step.status,
            "type": req.module,
            "name": name_lookup.get(str(req.reference_id_str), "Unknown"),
            "timestamp": step.action_at
        })
        
    return {
        "pending": pending,
        "summary": summary,
        "recent_activity": recent_activity
    }


def get_all_approvals(db: Session, entity_id: UUID, status_filter: Optional[str] = None) -> List[ApprovalRequest]:
    """
    Admin view: returns ApprovalRequests for the entity.

    By default returns ALL statuses (PENDING, APPROVED, REJECTED, IGNORED)
    so admins never see a blank screen unless there is truly no data.

    Pass status_filter="PENDING" to restrict to pending-only for dashboards.
    """
    query = (
        db.query(ApprovalRequest)
        .filter(ApprovalRequest.entity_id == entity_id)
    )

    # Optional status narrowing — ?status=PENDING, ?status=APPROVED, etc.
    if status_filter:
        query = query.filter(ApprovalRequest.status == status_filter.upper())

    requests = query.order_by(ApprovalRequest.created_at.desc()).all()

    # Same enrichment as get_my_approvals (batch, no N+1)
    offer_lookup = {}
    onboarding_lookup = {}

    for req in requests:
        if req.module == ApprovalModule.OFFER.value:
            offer_lookup[req.reference_id_str] = req
        elif req.module == ApprovalModule.ONBOARDING.value:
            onboarding_lookup[req.reference_id_str] = req

    if offer_lookup:
        from app.models.offer import Offer
        from app.models.application import Application
        offers = (
            db.query(Offer, Application)
            .join(Application, Offer.application_id == Application.id)
            .filter(Offer.id.in_(offer_lookup.keys()))
            .all()
        )
        for off, app in offers:
            ref_id_str = str(off.id)
            if ref_id_str in offer_lookup:
                offer_lookup[ref_id_str].reference = {
                    "title": app.candidate_name,
                    "subtitle": f"Role: {off.designation}",
                    "meta": {"salary": f"Salary: {off.offered_salary}" if off.offered_salary else ""},
                }

    if onboarding_lookup:
        emps = db.query(Employee).filter(Employee.id.in_(onboarding_lookup.keys())).all()
        for emp in emps:
            ref_id_str = str(emp.id)
            if ref_id_str in onboarding_lookup:
                onboarding_lookup[ref_id_str].reference = {
                    "title": emp.full_name,
                    "subtitle": f"Email: {emp.email}",
                    "meta": {"employee_code": f"ID: {emp.employee_code}" if emp.employee_code else "", "status": f"Status: {emp.status}"},
                }

    _enrich_sla_for_requests(db, requests)
    _enrich_total_steps_for_requests(db, requests)
    return requests

def check_escalations(db: Session):
    """
    Time-based Escalation Engine
    Cron-compatible, idempotent check for pending steps that have exceeded escalation_hours.
    """
    now = datetime.now(timezone.utc)
    
    pending_steps = (
        db.query(ApprovalStep, ApprovalConfigStep)
        .join(ApprovalRequest, ApprovalRequest.id == ApprovalStep.approval_request_id)
        .join(ApprovalConfig, (ApprovalConfig.module == ApprovalRequest.module) & (ApprovalConfig.entity_id == ApprovalRequest.entity_id))
        .join(ApprovalConfigStep, (ApprovalConfigStep.config_id == ApprovalConfig.id) & (ApprovalConfigStep.step_order == ApprovalStep.step_order))
        .filter(
            ApprovalStep.status == ApprovalStatus.PENDING.value,
            ApprovalStep.escalated_at == None,
            ApprovalConfigStep.escalation_hours != None
        )
        .all()
    )
    
    for step, cfg_step in pending_steps:
        diff_hours = (now - step.created_at).total_seconds() / 3600.0
        if diff_hours >= cfg_step.escalation_hours:
            try:
                with db.begin_nested():
                    lock_step = db.query(ApprovalStep).filter(ApprovalStep.id == step.id).with_for_update().first()
                    if lock_step and lock_step.escalated_at is None:
                        lock_step.escalated_at = now
                        
                        # Escalation logic: Notify manager if exists, else self
                        escalated_user = lock_step.approver_id
                        if lock_step.approver_id:
                            emp = db.query(Employee).filter(Employee.id == lock_step.approver_id).first()
                            if emp and emp.manager_id:
                                mgr = db.query(Employee).filter(Employee.user_id == emp.manager_id).first()
                                if mgr:
                                    escalated_user = mgr.id
                        
                        lock_step.escalated_to = escalated_user
                        db.flush()
                        
                        if escalated_user:
                            notify_approver(str(escalated_user), str(lock_step.approval_request_id), str(lock_step.id), db)
            except Exception as e:
                pass
    db.commit()


def get_approval_timeline(db: Session, approval_request_id: UUID) -> List[dict]:
    """
    Approval Timeline API matching UI presentation history, including pending future steps.
    """
    request = db.query(ApprovalRequest).filter(ApprovalRequest.id == approval_request_id).first()
    if not request:
        return []

    steps = (
        db.query(ApprovalStep, Employee)
        .outerjoin(Employee, ApprovalStep.approver_id == Employee.id)
        .filter(ApprovalStep.approval_request_id == approval_request_id)
        .order_by(ApprovalStep.step_order, ApprovalStep.created_at)
        .all()
    )
    
    timeline = []
    max_runtime_step = 0
    for step, emp in steps:
        max_runtime_step = max(max_runtime_step, step.step_order)
        timeline.append({
            "step_order": step.step_order,
            "approver_id": step.approver_id,
            "approver_name": emp.full_name if emp else "System/Auto",
            "status": step.status,
            "action_at": step.action_at,
            "remarks": step.remarks
        })
        
    # Inject future steps from Config that haven't been instantiated yet
    if request.status not in (ApprovalStatus.APPROVED.value, ApprovalStatus.REJECTED.value):
        config = db.query(ApprovalConfig).filter(
            ApprovalConfig.module == request.module,
            ApprovalConfig.entity_id == request.entity_id
        ).first()
        
        if config:
            future_steps = sorted(
                [s for s in config.steps if s.step_order > max_runtime_step],
                key=lambda x: x.step_order
            )
            for cfg_step in future_steps:
                approver_name = "Pending Assignment"
                if cfg_step.approver_type == ApproverType.ROLE.value:
                    approver_name = f"Role: {cfg_step.approver_value}"
                elif cfg_step.approver_type == ApproverType.MANAGER.value:
                    approver_name = "Manager"
                
                timeline.append({
                    "step_order": cfg_step.step_order,
                    "approver_id": None,
                    "approver_name": approver_name,
                    "status": "PENDING",
                    "action_at": None,
                    "remarks": None
                })

    return timeline


def bulk_take_action(
    db: Session, 
    request_ids: List[UUID], 
    approver_ids: List[UUID], 
    action: str, 
    remarks: Optional[str] = None,
    is_admin_override: bool = False
) -> dict:
    """
    Power feature processing multi-select approvals safely mapping exact independent transactions.
    """
    success = []
    failed = []
    
    for req_id in request_ids:
        try:
            take_action(db, req_id, approver_ids, action, remarks)
            success.append(req_id)
        except Exception as e:
            failed.append({"id": req_id, "error": str(e)})
            db.rollback() 
            
    return {"success": success, "failed": failed}


# --------------------------------------------------------------------------
# ANALYTICS
# --------------------------------------------------------------------------

def get_approval_analytics(
    db: Session,
    entity_id: UUID,
    days: Optional[int] = 30,
    module_filter: Optional[str] = None,
    status_filter: Optional[str] = None,
) -> dict:
    """
    Returns aggregated analytics for the Approval Analytics dashboard.
    All aggregations are done in the DB with GROUP BY — no Python-level N+1.
    """
    from sqlalchemy import case, cast, Date, extract

    now = datetime.now(timezone.utc)

    # ── Base filter ────────────────────────────────────────────────────────
    base_q = db.query(ApprovalRequest).filter(
        ApprovalRequest.entity_id == entity_id
    )
    if days:
        cutoff = now.replace(tzinfo=timezone.utc) if now.tzinfo else now
        from datetime import timedelta
        cutoff = now - timedelta(days=days)
        base_q = base_q.filter(ApprovalRequest.created_at >= cutoff)
    if module_filter:
        base_q = base_q.filter(ApprovalRequest.module == module_filter.upper())
    if status_filter:
        base_q = base_q.filter(ApprovalRequest.status == status_filter.upper())

    # ── 1. KPI Counts — single aggregation query ───────────────────────────
    counts_row = db.query(
        func.count(ApprovalRequest.id).label("total"),
        func.sum(
            case((ApprovalRequest.status == ApprovalStatus.PENDING.value, 1), else_=0)
        ).label("pending"),
        func.sum(
            case((ApprovalRequest.status == ApprovalStatus.APPROVED.value, 1), else_=0)
        ).label("approved"),
        func.sum(
            case((ApprovalRequest.status == ApprovalStatus.REJECTED.value, 1), else_=0)
        ).label("rejected"),
    ).filter(
        ApprovalRequest.entity_id == entity_id,
        *(
            [ApprovalRequest.created_at >= (now - __import__('datetime').timedelta(days=days))]
            if days else []
        ),
        *(
            [ApprovalRequest.module == module_filter.upper()]
            if module_filter else []
        ),
        *(
            [ApprovalRequest.status == status_filter.upper()]
            if status_filter else []
        ),
    ).one()

    total    = counts_row.total    or 0
    pending  = counts_row.pending  or 0
    approved = counts_row.approved or 0
    rejected = counts_row.rejected or 0

    # ── 2. Avg approval time — join with first APPROVED step ───────────────
    # Sub-query: first action_at per approved request
    first_action_subq = (
        db.query(
            ApprovalStep.approval_request_id,
            func.min(ApprovalStep.action_at).label("first_action_at"),
        )
        .filter(ApprovalStep.status == ApprovalStatus.APPROVED.value)
        .group_by(ApprovalStep.approval_request_id)
        .subquery()
    )

    timing_row = db.query(
        func.avg(
            extract("epoch", first_action_subq.c.first_action_at) -
            extract("epoch", ApprovalRequest.created_at)
        ).label("avg_seconds")
    ).join(
        first_action_subq,
        ApprovalRequest.id == first_action_subq.c.approval_request_id
    ).filter(
        ApprovalRequest.entity_id == entity_id,
        ApprovalRequest.status == ApprovalStatus.APPROVED.value,
    ).one()

    avg_seconds = timing_row.avg_seconds or 0.0
    avg_hours   = round(avg_seconds / 3600, 2)

    # ── 3. SLA breach — join with ApprovalConfigStep for escalation_hours ──
    # A breach = pending step where (now - step.created_at) > escalation_hours
    breach_subq = (
        db.query(ApprovalStep.approval_request_id)
        .join(
            ApprovalRequest,
            ApprovalRequest.id == ApprovalStep.approval_request_id,
        )
        .join(
            ApprovalConfig,
            (ApprovalConfig.module   == ApprovalRequest.module) &
            (ApprovalConfig.entity_id == ApprovalRequest.entity_id),
        )
        .join(
            ApprovalConfigStep,
            (ApprovalConfigStep.config_id   == ApprovalConfig.id) &
            (ApprovalConfigStep.step_order  == ApprovalStep.step_order),
        )
        .filter(
            ApprovalRequest.entity_id == entity_id,
            ApprovalStep.status == ApprovalStatus.PENDING.value,
            ApprovalConfigStep.escalation_hours != None,
            # hours elapsed > configured window
            (extract("epoch", func.now()) - extract("epoch", ApprovalStep.created_at))
            > (ApprovalConfigStep.escalation_hours * 3600),
        )
        .distinct()
        .subquery()
    )
    sla_breached_count = db.query(func.count()).select_from(breach_subq).scalar() or 0
    sla_breach_percent = round(sla_breached_count / total * 100, 1) if total > 0 else 0.0

    # ── 4. Approvals over time — daily GROUP BY ────────────────────────────
    daily_rows = db.query(
        cast(ApprovalRequest.created_at, Date).label("day"),
        func.count(ApprovalRequest.id).label("count"),
        func.sum(
            case((ApprovalRequest.status == ApprovalStatus.APPROVED.value, 1), else_=0)
        ).label("approved"),
        func.sum(
            case((ApprovalRequest.status == ApprovalStatus.PENDING.value, 1), else_=0)
        ).label("pending"),
        func.sum(
            case((ApprovalRequest.status == ApprovalStatus.REJECTED.value, 1), else_=0)
        ).label("rejected"),
    ).filter(
        ApprovalRequest.entity_id == entity_id,
        *(
            [ApprovalRequest.created_at >= (now - __import__('datetime').timedelta(days=days))]
            if days else []
        ),
        *(
            [ApprovalRequest.module == module_filter.upper()]
            if module_filter else []
        ),
    ).group_by(
        cast(ApprovalRequest.created_at, Date)
    ).order_by(
        cast(ApprovalRequest.created_at, Date)
    ).all()

    approvals_over_time = [
        {
            "date":     str(row.day),  # "YYYY-MM-DD"
            "total":    row.count,
            "approved": row.approved or 0,
            "pending":  row.pending  or 0,
            "rejected": row.rejected or 0,
        }
        for row in daily_rows
    ]

    # ── 5. Approvals by module — GROUP BY module ───────────────────────────
    module_rows = db.query(
        ApprovalRequest.module,
        func.count(ApprovalRequest.id).label("count"),
    ).filter(
        ApprovalRequest.entity_id == entity_id,
        *(
            [ApprovalRequest.created_at >= (now - __import__('datetime').timedelta(days=days))]
            if days else []
        ),
    ).group_by(
        ApprovalRequest.module
    ).order_by(
        func.count(ApprovalRequest.id).desc()
    ).all()

    approvals_by_module = [
        {"module": row.module, "count": row.count}
        for row in module_rows
    ]

    # ── 6. Status distribution ─────────────────────────────────────────────
    status_rows = db.query(
        ApprovalRequest.status,
        func.count(ApprovalRequest.id).label("count"),
    ).filter(
        ApprovalRequest.entity_id == entity_id,
        *(
            [ApprovalRequest.created_at >= (now - __import__('datetime').timedelta(days=days))]
            if days else []
        ),
    ).group_by(
        ApprovalRequest.status
    ).all()

    status_distribution = [
        {"status": row.status, "count": row.count}
        for row in status_rows
    ]

    return {
        "total":                total,
        "pending":              pending,
        "approved":             approved,
        "rejected":             rejected,
        "avg_approval_hours":   avg_hours,
        "sla_breach_percent":   sla_breach_percent,
        "sla_breached_count":   sla_breached_count,
        "approvals_over_time":  approvals_over_time,
        "approvals_by_module":  approvals_by_module,
        "status_distribution":  status_distribution,
    }
