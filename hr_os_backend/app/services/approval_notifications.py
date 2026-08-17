import uuid
from sqlalchemy.orm import Session
from app.models.employee import Employee
from app.models.approval import ApprovalRequest, NotificationLog
from datetime import datetime, timezone
from app.utils.notification_service import create_notification, send_email

def notify_approver(employee_id: str, approval_request_id: str, approval_step_id: str, db: Session = None):
    """
    Notification Hook System triggered when new approval steps are created
    or when the next step becomes active.
    
    Includes deduplication to prevent spamming approvers.
    """
    if db:
        # Check deduplication log
        existing = db.query(NotificationLog).filter(
            NotificationLog.approval_step_id == approval_step_id,
            NotificationLog.employee_id == employee_id
        ).first()

        if existing:
            print(f"[NOTIFICATION HOOK] Skipped duplicate notification for employee {employee_id} on step {approval_step_id}")
            return False

        # If not existing, process the actual notification dispatch here
        print(f"[NOTIFICATION HOOK] Notifying employee {employee_id} for approval request {approval_request_id}")
        
        emp = db.query(Employee).filter(Employee.id == employee_id).first()
        req = db.query(ApprovalRequest).filter(ApprovalRequest.id == approval_request_id).first()
        
        if emp and req:
            title = f"Action Required: {req.module} Approval"
            body = f"An approval request for {req.module} (ID: {req.reference_id_str}) is pending your review."
            
            # 1. In-app notification
            create_notification(
                db=db,
                entity_id=req.entity_id,
                user_id=emp.user_id,
                user_email=emp.email,
                title=title,
                body=body,
                type=req.module
            )
            
            # 2. Email notification
            send_email(
                to_email=emp.email,
                subject=title,
                body=body
            )

        # Insert log
        new_log = NotificationLog(
            approval_request_id=approval_request_id,
            approval_step_id=approval_step_id,
            employee_id=employee_id,
            sent_at=datetime.now(timezone.utc)
        )
        db.add(new_log)
        db.flush() 
        
    return True
