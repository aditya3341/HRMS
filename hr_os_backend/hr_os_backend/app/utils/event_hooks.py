"""
=============================================================
 HR OS — Event Hooks (Handlers)
 
 Each function handles one event type.
 Signature: handler(payload: dict, db: Session) -> None
 
 DO NOT raise exceptions here — the dispatcher will catch them.
=============================================================
"""
from sqlalchemy.orm import Session
from app.utils.notification_service import create_notification, send_email


# ------------------------------------
# OFFER APPROVED
# Triggered by: POST /offers/{id}/approve
# Payload: { "offer": Offer, "application": Application, "offer_letter_path": str }
# ------------------------------------
def handle_offer_approved(payload: dict, db: Session) -> None:
    offer = payload.get("offer")
    application = payload.get("application")
    offer_letter_path = payload.get("offer_letter_path")

    if not (offer and application):
        return

    # 1. In-app notification (stored in DB)
    create_notification(
        db=db,
        user_email=application.email,
        title="🎉 Offer Letter Ready",
        body=f"Your offer for the position of {offer.designation} has been approved. Please check your email.",
    )

    # 2. Email with offer letter attachment
    send_email(
        to_email=application.email,
        subject=f"Offer Letter — {offer.designation}",
        body=(
            f"Dear {application.candidate_name},\n\n"
            f"We are pleased to extend an offer for the position of {offer.designation}. "
            f"Please find your offer letter attached.\n\n"
            f"Joining Date: {offer.joining_date}\n\n"
            f"Best regards,\nHR Team"
        ),
        attachment_path=offer_letter_path,
    )


# ------------------------------------
# ONBOARDING STARTED
# Triggered by: POST /onboarding/start/{application_id}
# Payload: { "employee": Employee }
# ------------------------------------
def handle_onboarding_started(payload: dict, db: Session) -> None:
    employee = payload.get("employee")
    if not employee:
        return

    create_notification(
        db=db,
        user_email=employee.email,
        title="👋 Welcome! Onboarding Started",
        body=(
            f"Hello {employee.full_name}! Your onboarding has been initiated. "
            f"Your Employee ID is {employee.employee_code}. "
            f"Please complete your profile and upload required documents."
        ),
    )

    send_email(
        to_email=employee.email,
        subject="Welcome to the Team — Complete Your Onboarding",
        body=(
            f"Dear {employee.full_name},\n\n"
            f"Welcome aboard! Your employee ID is: {employee.employee_code}.\n\n"
            f"Please log in to the HR portal to complete your onboarding steps.\n\n"
            f"Best regards,\nHR Team"
        ),
    )


# ------------------------------------
# LEAVE APPLIED
# Triggered by: POST /attendance/leave (future)
# Payload: { "employee": Employee, "manager_email": str, "leave_type": str, "from_date": str, "to_date": str }
# ------------------------------------
def handle_leave_applied(payload: dict, db: Session) -> None:
    employee = payload.get("employee")
    manager_email = payload.get("manager_email")
    leave_type = payload.get("leave_type", "Leave")
    from_date = payload.get("from_date", "")
    to_date = payload.get("to_date", "")

    if not employee or not manager_email:
        return

    # Notify manager
    create_notification(
        db=db,
        user_email=manager_email,
        title=f"📋 Leave Request: {employee.full_name}",
        body=f"{employee.full_name} has applied for {leave_type} from {from_date} to {to_date}. Please review.",
    )

    # Confirm to employee
    create_notification(
        db=db,
        user_email=employee.email,
        title="✅ Leave Request Submitted",
        body=f"Your {leave_type} request from {from_date} to {to_date} has been submitted. Pending manager approval.",
    )


# ------------------------------------
# INTERVIEW STAGE MOVED
# Triggered by: POST /interviews/{id}/move
# Payload: { "application": Application, "from_status": str, "to_status": str }
# ------------------------------------
def handle_interview_moved(payload: dict, db: Session) -> None:
    application = payload.get("application")
    from_status = payload.get("from_status", "")
    to_status = payload.get("to_status", "")

    if not application:
        return

    if to_status == "SELECTED":
        create_notification(
            db=db,
            user_email=application.email,
            title="🏆 Congratulations! You've been Selected",
            body="You have moved to the final stage. An offer will be prepared shortly. Please check your email.",
        )
    elif to_status == "REJECTED":
        create_notification(
            db=db,
            user_email=application.email,
            title="Application Status Update",
            body="Thank you for applying. After careful consideration, we are unable to proceed with your application at this time.",
        )
