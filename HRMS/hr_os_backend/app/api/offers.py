"""Offers API — native MongoDB."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime
from uuid import uuid4

from app.core.mongodb import get_mongo_db
from app.auth.deps import get_current_user
from app.auth.constants import Permissions
from app.auth.permission import require_permission
from app.utils.audit import log_audit
from app.utils.notification_service import create_notification

router = APIRouter(prefix="/offers", tags=["Offers"])

class OfferCreate(BaseModel):
    application_id: str
    designation: str = ""
    ctc: float = 0
    joining_date: str | None = None
    notes: str = ""

class OfferAction(BaseModel):
    action: str  # APPROVE, REJECT, SEND, ACCEPT, DECLINE

@router.get("/", dependencies=[Depends(require_permission(Permissions.OFFER_READ))])
def list_offers(current_user=Depends(get_current_user), status: str | None = None):
    db = get_mongo_db()
    filt: dict = {"entity_id": current_user["entity_id"]}
    if status:
        filt["status"] = status.upper()
    offers = list(db.offers.find(filt).sort("created_at", -1))
    for o in offers:
        o.pop("_id", None)
        app = db.applications.find_one({"_id": o.get("application_id")})
        o["candidate_name"] = app.get("candidate_name") if app else "Unknown"
        o["candidate_email"] = app.get("candidate_email") if app else ""
        for key in ["created_at", "joining_date"]:
            if key in o and hasattr(o[key], "isoformat"):
                o[key] = o[key].isoformat()
    return {"success": True, "data": offers, "error": None}

@router.get("/{offer_id}", dependencies=[Depends(require_permission(Permissions.OFFER_READ))])
def get_offer(offer_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    offer = db.offers.find_one({"_id": offer_id})
    if not offer:
        raise HTTPException(404, "Offer not found")
    offer.pop("_id", None)
    app = db.applications.find_one({"_id": offer.get("application_id")})
    offer["candidate_name"] = app.get("candidate_name") if app else "Unknown"
    for key in ["created_at", "joining_date"]:
        if key in offer and hasattr(offer[key], "isoformat"):
            offer[key] = offer[key].isoformat()
    return {"success": True, "data": offer, "error": None}

@router.post("/", dependencies=[Depends(require_permission(Permissions.OFFER_CREATE))])
def create_offer(payload: OfferCreate, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    app = db.applications.find_one({"_id": payload.application_id})
    if not app:
        raise HTTPException(404, "Application not found")

    oid = str(uuid4())
    joining = datetime.strptime(payload.joining_date, "%Y-%m-%d") if payload.joining_date else None
    doc = {
        "_id": oid, "id": oid,
        "entity_id": current_user["entity_id"],
        "application_id": payload.application_id,
        "designation": payload.designation,
        "ctc": payload.ctc,
        "joining_date": joining,
        "notes": payload.notes,
        "status": "PENDING_APPROVAL",
        "created_at": datetime.utcnow(),
        "created_by": current_user["user_id"],
    }
    db.offers.insert_one(doc)
    db.applications.update_one({"_id": payload.application_id}, {"$set": {"status": "OFFER_CREATED"}})

    # Notify HR/Admin users
    for hr_user in db.users.find({"role": {"$in": ["SUPER_ADMIN", "HR_ADMIN", "HR"]}}):
        create_notification(
            user_id=hr_user["_id"],
            title="New Offer Awaiting Approval",
            message=f"Offer for {app.get('candidate_name', 'candidate')} requires approval.",
            notification_type="OFFER",
            entity_id=current_user["entity_id"],
            link="/offers/approval",
        )

    log_audit(user=current_user, action="OFFER_CREATED", module="Hiring",
              resource_type="Offer", resource_id=oid)
    doc.pop("_id", None)
    for key in ["created_at", "joining_date"]:
        if key in doc and doc[key] and hasattr(doc[key], "isoformat"):
            doc[key] = doc[key].isoformat()
    return {"success": True, "data": doc, "error": None}

@router.patch("/{offer_id}/action", dependencies=[Depends(require_permission(Permissions.OFFER_APPROVE))])
def offer_action(offer_id: str, payload: OfferAction, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    offer = db.offers.find_one({"_id": offer_id})
    if not offer:
        raise HTTPException(404, "Offer not found")

    action = payload.action.upper()
    status_map = {
        "APPROVE": "APPROVED", "REJECT": "REJECTED", "SEND": "SENT",
        "ACCEPT": "ACCEPTED", "DECLINE": "DECLINED", "CANCEL": "CANCELLED",
    }
    new_status = status_map.get(action)
    if not new_status:
        raise HTTPException(400, f"Invalid action: {action}")

    db.offers.update_one({"_id": offer_id}, {"$set": {"status": new_status}})

    # Notify creator
    if offer.get("created_by"):
        app_doc = db.applications.find_one({"_id": offer.get("application_id")})
        c_name = app_doc.get("candidate_name", "candidate") if app_doc else "candidate"
        create_notification(
            user_id=offer["created_by"],
            title=f"Offer Status: {new_status}",
            message=f"Offer for {c_name} has been marked as {new_status.lower()}.",
            notification_type="OFFER",
            entity_id=current_user["entity_id"],
            link="/offers",
        )

    # Update application status
    app_status_map = {"SENT": "OFFER_SENT", "ACCEPTED": "OFFER_ACCEPTED"}
    if new_status in app_status_map:
        db.applications.update_one({"_id": offer.get("application_id")}, {"$set": {"status": app_status_map[new_status]}})

    return {"success": True, "data": {"message": f"Offer {action.lower()}ed", "status": new_status}, "error": None}

@router.get("/pending-approval", dependencies=[Depends(require_permission(Permissions.OFFER_APPROVE))])
def list_pending_offers(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    offers = list(db.offers.find({"entity_id": current_user["entity_id"], "status": "PENDING_APPROVAL"}).sort("created_at", -1))
    for o in offers:
        o.pop("_id", None)
        app = db.applications.find_one({"_id": o.get("application_id")})
        o["candidate_name"] = app.get("candidate_name") if app else "Unknown"
        for key in ["created_at", "joining_date"]:
            if key in o and hasattr(o[key], "isoformat"):
                o[key] = o[key].isoformat()
    return {"success": True, "data": offers, "error": None}


@router.post("/{offer_id}/approve", dependencies=[Depends(require_permission(Permissions.OFFER_APPROVE))])
def approve_offer_direct(offer_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    db.offers.update_one({"_id": offer_id}, {"$set": {"status": "APPROVED", "approved_by": current_user["user_id"]}})

    # Notify creator
    off = db.offers.find_one({"_id": offer_id})
    if off and off.get("created_by"):
        app_doc = db.applications.find_one({"_id": off.get("application_id")})
        c_name = app_doc.get("candidate_name", "candidate") if app_doc else "candidate"
        create_notification(
            user_id=off["created_by"],
            title="Offer Approved",
            message=f"Offer for {c_name} has been approved.",
            notification_type="OFFER",
            entity_id=current_user["entity_id"],
            link="/offers",
        )
    return {"success": True, "data": {"message": "Offer approved", "status": "APPROVED"}, "error": None}


@router.post("/{offer_id}/reject", dependencies=[Depends(require_permission(Permissions.OFFER_APPROVE))])
def reject_offer_direct(offer_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    db.offers.update_one({"_id": offer_id}, {"$set": {"status": "REJECTED"}})

    # Notify creator
    off = db.offers.find_one({"_id": offer_id})
    if off and off.get("created_by"):
        app_doc = db.applications.find_one({"_id": off.get("application_id")})
        c_name = app_doc.get("candidate_name", "candidate") if app_doc else "candidate"
        create_notification(
            user_id=off["created_by"],
            title="Offer Rejected",
            message=f"Offer for {c_name} has been rejected.",
            notification_type="OFFER",
            entity_id=current_user["entity_id"],
            link="/offers",
        )
    return {"success": True, "data": {"message": "Offer rejected", "status": "REJECTED"}, "error": None}


@router.post("/{offer_id}/send", dependencies=[Depends(require_permission(Permissions.OFFER_CREATE))])
def send_offer_direct(offer_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    off = db.offers.find_one({"_id": offer_id})
    if not off:
        raise HTTPException(404, "Offer not found")
    db.offers.update_one({"_id": offer_id}, {"$set": {"status": "SENT"}})
    db.applications.update_one({"_id": off.get("application_id")}, {"$set": {"status": "OFFER_SENT"}})
    return {"success": True, "data": {"message": "Offer sent", "status": "SENT"}, "error": None}


@router.post("/{offer_id}/accept")
def accept_offer_direct(offer_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    off = db.offers.find_one({"_id": offer_id})
    if not off:
        raise HTTPException(404, "Offer not found")
    db.offers.update_one({"_id": offer_id}, {"$set": {"status": "ACCEPTED"}})
    db.applications.update_one({"_id": off.get("application_id")}, {"$set": {"status": "OFFER_ACCEPTED"}})
    return {"success": True, "data": {"message": "Offer accepted", "status": "ACCEPTED"}, "error": None}


@router.post("/{offer_id}/decline")
def decline_offer_direct(offer_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    db.offers.update_one({"_id": offer_id}, {"$set": {"status": "DECLINED"}})
    return {"success": True, "data": {"message": "Offer declined", "status": "DECLINED"}, "error": None}


@router.post("/{offer_id}/mark-joined", dependencies=[Depends(require_permission(Permissions.OFFER_APPROVE))])
def mark_joined_direct(offer_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    off = db.offers.find_one({"_id": offer_id})
    if not off:
        raise HTTPException(404, "Offer not found")

    db.offers.update_one({"_id": offer_id}, {"$set": {"status": "JOINED"}})
    db.applications.update_one({"_id": off.get("application_id")}, {"$set": {"status": "ONBOARDING_STARTED"}})

    # Create employee record if not exists
    app = db.applications.find_one({"_id": off.get("application_id")})
    if app:
        existing_emp = db.employees.find_one({"email": app.get("candidate_email"), "entity_id": current_user["entity_id"]})
        if not existing_emp:
            eid = str(uuid4())
            db.employees.insert_one({
                "_id": eid, "id": eid,
                "entity_id": current_user["entity_id"],
                "full_name": app.get("candidate_name"),
                "email": app.get("candidate_email"),
                "status": "ONBOARDING",
                "employee_code": f"TEMP-{datetime.utcnow().strftime('%M%S')}",
                "documents_uploaded": False,
                "policies_accepted": False,
                "created_at": datetime.utcnow()
            })

    return {"success": True, "data": {"message": "Offer marked as joined", "status": "JOINED"}, "error": None}