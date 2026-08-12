from sqlalchemy.orm import Session
from app.models.approval import ApprovalModule
from app.utils.notification_service import create_notification, send_email
from uuid import UUID

def trigger_post_approval(module: str, reference_id_str: str, db: Session):
    """
    Modular trigger handler that fires when a final approval is reached.
    Applies actual business logic across the system.
    """
    
    # reference_id_str typically holds the UUID representation
    reference_id = None
    try:
        reference_id = UUID(reference_id_str)
    except ValueError:
        pass
        
    if module == ApprovalModule.OFFER.value:
        from app.models.offer import Offer
        from app.models.enums import OfferStatus
        
        # Mark offer as approved
        # This will allow it to be SENT to the candidate
        offer = db.query(Offer).filter(Offer.id == reference_id).first()
        if offer:
            offer.status = OfferStatus.APPROVED.value
            db.flush()
            
            # NOTIFICATION: Notify Creator/HR
            from app.models.employee import Employee
            creator = db.query(Employee).filter(Employee.email == offer.created_by).first()
            if creator:
                create_notification(
                    db=db,
                    entity_id=offer.entity_id,
                    user_id=creator.user_id,
                    user_email=creator.email,
                    title="Offer Approved",
                    body=f"Offer for candidate (ID: {offer.application_id}) has been approved.",
                    type="OFFER"
                )

    elif module == ApprovalModule.ONBOARDING.value:
        from app.models.employee import Employee
        from app.models.enums import EmployeeStatus
        
        # Activate employee
        employee = db.query(Employee).filter(Employee.id == reference_id).first()
        if employee:
            employee.status = EmployeeStatus.ACTIVE.value
            db.flush()
            
            # NOTIFICATION: Notify HR/Admin
            create_notification(
                db=db,
                entity_id=employee.entity_id,
                user_id=employee.user_id,
                user_email=employee.email,
                title="Onboarding Completed",
                body=f"Onboarding for {employee.full_name} has been completed. Profile is now active.",
                type="ONBOARDING"
            )
            
    elif module == ApprovalModule.EMPLOYEE.value:
        # Placeholder for employee profile updates
        # e.g., applying pending changes (promotion, role change, etc.)
        pass
