"""Approvals API — native MongoDB."""
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timedelta
from uuid import uuid4
from pydantic import BaseModel
from typing import Optional

from app.core.mongodb import get_mongo_db
from app.auth.deps import get_current_user
from app.utils.audit import log_audit
from app.utils.notification_service import create_notification

router = APIRouter(prefix="/approvals", tags=["Approvals"])


class ApprovalActionRequest(BaseModel):
    action: str  # APPROVED or REJECTED
    remarks: Optional[str] = None


def _enrich_request_reference(db, req: dict) -> dict:
    ref_id = req.get("reference_id_str")
    module = req.get("module", "").upper()
    ref_data = {"title": "Request Details", "subtitle": "", "meta": {}}

    if not ref_id:
        req["reference"] = ref_data
        return req

    if "OFFER" in module:
        off = db.offers.find_one({"_id": ref_id})
        if off:
            app = db.applications.find_one({"_id": off.get("application_id")})
            ref_data["title"] = app.get("candidate_name", "Candidate") if app else "Candidate Offer"
            ref_data["subtitle"] = f"Role: {off.get('designation', '')}"
            ref_data["meta"] = {"salary": f"CTC: {off.get('ctc', '')}"}
    elif "ONBOARDING" in module or "EMPLOYEE" in module:
        emp = db.employees.find_one({"_id": ref_id})
        if emp:
            ref_data["title"] = emp.get("full_name", "Employee")
            ref_data["subtitle"] = f"Email: {emp.get('email', '')}"
            ref_data["meta"] = {
                "employee_code": f"ID: {emp.get('employee_code', '')}",
                "status": f"Status: {emp.get('status', '')}"
            }
    elif "LEAVE" in module:
        leave = db.leave_requests.find_one({"_id": ref_id})
        if leave:
            emp = db.employees.find_one({"_id": leave.get("employee_id")})
            ref_data["title"] = emp.get("full_name", "Employee") if emp else "Leave Request"
            ref_data["subtitle"] = f"Type: {leave.get('leave_type_name', 'Leave')}"
            ref_data["meta"] = {
                "days": f"Days: {leave.get('days', 1.0)}",
                "reason": leave.get("reason", "")
            }

    req["reference"] = ref_data
    return req


@router.get("/action-center")
def get_action_center(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    entity_id = current_user["entity_id"]
    emp = db.employees.find_one({"user_id": current_user["user_id"], "entity_id": entity_id})
    approver_id = emp["_id"] if emp else current_user["user_id"]

    # 1. Pending Approvals
    steps = list(db.approval_steps.find({"approver_id": approver_id, "status": "PENDING"}))
    req_ids = list(set([s["approval_request_id"] for s in steps]))

    requests = list(db.approval_requests.find({"_id": {"$in": req_ids}, "entity_id": entity_id}))

    pending = []
    for r in requests:
        req_item = {
            "id": r["_id"],
            "entity_id": r.get("entity_id"),
            "module": r.get("module"),
            "reference_id_str": r.get("reference_id_str"),
            "priority": "MEDIUM",
            "requested_by": r.get("requested_by"),
            "status": r.get("status", "PENDING"),
            "current_step": r.get("current_step", 1),
            "total_steps": 3,
            "created_at": r["created_at"].isoformat() if hasattr(r.get("created_at"), "isoformat") else str(r.get("created_at")),
            "updated_at": r["created_at"].isoformat() if hasattr(r.get("created_at"), "isoformat") else str(r.get("created_at")),
            "sla": {"status": "SAFE", "hours_left": 24.0}
        }
        
        req_item = _enrich_request_reference(db, req_item)
        pending.append(req_item)

    # 2. Summary
    total_pending = len(pending)
    offers = len([r for r in pending if r.get("module") == "OFFER"])
    onboarding = len([r for r in pending if r.get("module") == "ONBOARDING"])
    summary = {
        "total_pending": total_pending,
        "offers": offers,
        "onboarding": onboarding
    }

    # 3. Recent Activity (last 10 actions in entity)
    entity_requests = list(db.approval_requests.find({"entity_id": entity_id}, {"_id": 1}))
    entity_req_ids = [r["_id"] for r in entity_requests]

    recent_steps = list(db.approval_steps.find({
        "approval_request_id": {"$in": entity_req_ids},
        "status": {"$in": ["APPROVED", "REJECTED"]}
    }).sort("acted_at", -1).limit(10))

    recent_activity = []
    for step in recent_steps:
        req = db.approval_requests.find_one({"_id": step.get("approval_request_id")})
        if not req:
            continue

        name = "Unknown"
        ref_id = req.get("reference_id_str")
        module = req.get("module", "").upper()

        if "OFFER" in module:
            off = db.offers.find_one({"_id": ref_id})
            if off:
                app = db.applications.find_one({"_id": off.get("application_id")})
                if app:
                    name = app.get("candidate_name", "Candidate")
        elif "ONBOARDING" in module or "EMPLOYEE" in module:
            emp_rec = db.employees.find_one({"_id": ref_id})
            if emp_rec:
                name = emp_rec.get("full_name", "Employee")
        elif "LEAVE" in module:
            leave = db.leave_requests.find_one({"_id": ref_id})
            if leave:
                emp_rec = db.employees.find_one({"_id": leave.get("employee_id")})
                if emp_rec:
                    name = emp_rec.get("full_name", "Employee")

        recent_activity.append({
            "id": step.get("id", step["_id"]),
            "action": step.get("status", "").lower(),
            "type": req.get("module", ""),
            "name": name,
            "timestamp": step["acted_at"].isoformat() if step.get("acted_at") and hasattr(step["acted_at"], "isoformat") else str(step.get("acted_at")) if step.get("acted_at") else None
        })

    return {
        "success": True,
        "data": {
            "pending": pending,
            "summary": summary,
            "recent_activity": recent_activity
        },
        "error": None
    }


@router.get("/requests/my")
def get_my_approvals_api(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    entity_id = current_user["entity_id"]
    emp = db.employees.find_one({"user_id": current_user["user_id"], "entity_id": entity_id})
    approver_id = emp["_id"] if emp else current_user["user_id"]

    # Get active pending steps for this user
    steps = list(db.approval_steps.find({"approver_id": approver_id, "status": "PENDING"}))
    req_ids = list(set([s["approval_request_id"] for s in steps]))

    requests = list(db.approval_requests.find({"_id": {"$in": req_ids}, "entity_id": entity_id}))

    data = []
    for r in requests:
        req_item = {
            "id": r["_id"],
            "entity_id": r.get("entity_id"),
            "module": r.get("module"),
            "reference_id_str": r.get("reference_id_str"),
            "priority": "MEDIUM",
            "requested_by": r.get("requested_by"),
            "status": r.get("status", "PENDING"),
            "current_step": r.get("current_step", 1),
            "total_steps": 3,
            "created_at": r["created_at"].isoformat() if hasattr(r.get("created_at"), "isoformat") else str(r.get("created_at")),
            "updated_at": r["created_at"].isoformat() if hasattr(r.get("created_at"), "isoformat") else str(r.get("created_at")),
            "sla": {"status": "SAFE", "hours_left": 24.0}
        }
        
        req_item = _enrich_request_reference(db, req_item)
        data.append(req_item)

    return {"success": True, "data": data, "error": None}


@router.get("/requests/all")
def get_all_approvals_api(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    entity_id = current_user["entity_id"]

    requests = list(db.approval_requests.find({"entity_id": entity_id}).sort("created_at", -1))

    data = []
    for r in requests:
        req_item = {
            "id": r["_id"],
            "entity_id": r.get("entity_id"),
            "module": r.get("module"),
            "reference_id_str": r.get("reference_id_str"),
            "priority": "MEDIUM",
            "requested_by": r.get("requested_by"),
            "status": r.get("status", "PENDING"),
            "current_step": r.get("current_step", 1),
            "total_steps": 3,
            "created_at": r["created_at"].isoformat() if hasattr(r.get("created_at"), "isoformat") else str(r.get("created_at")),
            "updated_at": r["created_at"].isoformat() if hasattr(r.get("created_at"), "isoformat") else str(r.get("created_at")),
            "sla": {"status": "SAFE", "hours_left": 24.0}
        }
        
        req_item = _enrich_request_reference(db, req_item)
        data.append(req_item)

    return {"success": True, "data": data, "error": None}


@router.get("/requests/{id}/timeline")
def get_approval_timeline_api(id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    steps = list(db.approval_steps.find({"approval_request_id": id}).sort("step_order", 1))

    timeline = []
    for s in steps:
        emp = db.employees.find_one({"_id": s.get("approver_id")})
        timeline.append({
            "step_order": s.get("step_order", 1),
            "approver_id": s.get("approver_id"),
            "approver_name": emp.get("full_name") if emp else "System/Auto",
            "status": s.get("status", "PENDING"),
            "action_at": s["acted_at"].isoformat() if s.get("acted_at") and hasattr(s["acted_at"], "isoformat") else None,
            "remarks": s.get("remarks")
        })

    return {"success": True, "data": timeline, "error": None}


@router.post("/requests/{id}/action")
def submit_approval_action_api(id: str, payload: ApprovalActionRequest, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    req = db.approval_requests.find_one({"_id": id, "entity_id": current_user["entity_id"]})
    if not req:
        raise HTTPException(status_code=404, detail="Approval request not found")

    emp = db.employees.find_one({"user_id": current_user["user_id"], "entity_id": current_user["entity_id"]})
    approver_id = emp["_id"] if emp else current_user["user_id"]

    # Find the pending step for this approver
    step = db.approval_steps.find_one({
        "approval_request_id": id,
        "approver_id": approver_id,
        "status": "PENDING"
    })

    if not step:
        raise HTTPException(status_code=400, detail="No pending approval step found for this user")

    now = datetime.utcnow()
    # Update the step
    db.approval_steps.update_one({"_id": step["_id"]}, {"$set": {
        "status": payload.action,
        "acted_at": now,
        "remarks": payload.remarks
    }})

    # Update request status if rejected or check if all steps are completed to approve the request
    if payload.action == "REJECTED":
        db.approval_requests.update_one({"_id": id}, {"$set": {"status": "REJECTED"}})
        
        # Notify requester
        requester_user_id = req.get("requested_by")
        requester_emp = db.employees.find_one({"_id": requester_user_id})
        if requester_emp and requester_emp.get("user_id"):
            requester_user_id = requester_emp["user_id"]
        if requester_user_id:
            create_notification(
                user_id=requester_user_id,
                title="Request Rejected",
                message=f"Your request in module {req.get('module')} has been rejected.",
                notification_type="OFFER" if "OFFER" in req.get("module", "") else "LEAVE" if "LEAVE" in req.get("module", "") else "INFO",
                entity_id=current_user["entity_id"],
                link="/action-center",
            )
    else:
        # Check if there are other pending steps
        pending_exists = db.approval_steps.count_documents({
            "approval_request_id": id,
            "status": "PENDING"
        })
        if pending_exists == 0:
            db.approval_requests.update_one({"_id": id}, {"$set": {"status": "APPROVED"}})
            # Apply side effects (e.g. approve offer, start onboarding)
            module = req.get("module", "").upper()
            ref_id = req.get("reference_id_str")
            if "OFFER" in module:
                db.offers.update_one({"_id": ref_id}, {"$set": {"status": "APPROVED"}})
            elif "ONBOARDING" in module:
                db.employees.update_one({"_id": ref_id}, {"$set": {"status": "ACTIVE"}})
                
            # Notify requester
            requester_user_id = req.get("requested_by")
            requester_emp = db.employees.find_one({"_id": requester_user_id})
            if requester_emp and requester_emp.get("user_id"):
                requester_user_id = requester_emp["user_id"]
            if requester_user_id:
                create_notification(
                    user_id=requester_user_id,
                    title="Request Approved",
                    message=f"Your request in module {req.get('module')} has been approved.",
                    notification_type="OFFER" if "OFFER" in req.get("module", "") else "LEAVE" if "LEAVE" in req.get("module", "") else "INFO",
                    entity_id=current_user["entity_id"],
                    link="/action-center",
                )
        else:
            # Notify next approver
            next_step = db.approval_steps.find_one({
                "approval_request_id": id,
                "status": "PENDING"
            })
            if next_step and next_step.get("approver_id"):
                approver_emp = db.employees.find_one({"_id": next_step["approver_id"]})
                if approver_emp and approver_emp.get("user_id"):
                    create_notification(
                        user_id=approver_emp["user_id"],
                        title="New Approval Awaiting Your Action",
                        message=f"You have a pending approval request in module {req.get('module')}.",
                        notification_type="INFO",
                        entity_id=current_user["entity_id"],
                        link="/action-center",
                    )

    log_audit(
        user=current_user,
        action="APPROVAL_ACTION",
        module="Approvals",
        resource_type="ApprovalRequest",
        resource_id=id,
        new_values={"action": payload.action, "remarks": payload.remarks}
    )

    updated_req = db.approval_requests.find_one({"_id": id})
    req_item = {
        "id": updated_req["_id"],
        "entity_id": updated_req.get("entity_id"),
        "module": updated_req.get("module"),
        "reference_id_str": updated_req.get("reference_id_str"),
        "priority": "MEDIUM",
        "requested_by": updated_req.get("requested_by"),
        "status": updated_req.get("status", "PENDING"),
        "current_step": updated_req.get("current_step", 1),
        "total_steps": 3,
        "created_at": updated_req["created_at"].isoformat() if hasattr(updated_req.get("created_at"), "isoformat") else str(updated_req.get("created_at")),
        "updated_at": updated_req["created_at"].isoformat() if hasattr(updated_req.get("created_at"), "isoformat") else str(updated_req.get("created_at")),
    }
    req_item = _enrich_request_reference(db, req_item)

    return {"success": True, "data": req_item, "error": None}


@router.get("/inbox")
def get_inbox(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    entity_id = current_user["entity_id"]
    emp = db.employees.find_one({"user_id": current_user["user_id"], "entity_id": entity_id})
    approver_id = emp["_id"] if emp else current_user["user_id"]

    steps = list(db.approval_steps.find({"approver_id": approver_id, "status": "PENDING"}))
    items = []
    for step in steps:
        req = db.approval_requests.find_one({"_id": step.get("approval_request_id")})
        if req:
            items.append({
                "id": step.get("id", step["_id"]),
                "request_id": req.get("id", req["_id"]),
                "type": req.get("type", ""),
                "title": req.get("title", ""),
                "requested_by": req.get("requested_by_name", ""),
                "status": step.get("status"),
                "created_at": req["created_at"].isoformat() if req.get("created_at") and hasattr(req["created_at"], "isoformat") else None,
            })
    return {"success": True, "data": items, "error": None}


@router.patch("/{step_id}/approve")
def approve_step(step_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    db.approval_steps.update_one({"_id": step_id}, {"$set": {"status": "APPROVED", "acted_at": datetime.utcnow()}})
    return {"success": True, "data": {"message": "Approved"}, "error": None}


@router.patch("/{step_id}/reject")
def reject_step(step_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    db.approval_steps.update_one({"_id": step_id}, {"$set": {"status": "REJECTED", "acted_at": datetime.utcnow()}})
    return {"success": True, "data": {"message": "Rejected"}, "error": None}


@router.get("/history")
def approval_history(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    emp = db.employees.find_one({"user_id": current_user["user_id"], "entity_id": current_user["entity_id"]})
    approver_id = emp["_id"] if emp else current_user["user_id"]
    steps = list(db.approval_steps.find({"approver_id": approver_id, "status": {"$ne": "PENDING"}}).sort("acted_at", -1).limit(50))
    for s in steps:
        s.pop("_id", None)
        if "acted_at" in s and hasattr(s["acted_at"], "isoformat"):
            s["acted_at"] = s["acted_at"].isoformat()
    return {"success": True, "data": steps, "error": None}


@router.get("/analytics")
def get_approvals_analytics(
    days: Optional[int] = None,
    module: Optional[str] = None,
    status: Optional[str] = None,
    current_user=Depends(get_current_user)
):
    db = get_mongo_db()
    entity_id = current_user["entity_id"]
    
    # 1. Build query for approval_requests
    query = {"entity_id": entity_id}
    
    if days:
        cutoff = datetime.utcnow() - timedelta(days=days)
        query["created_at"] = {"$gte": cutoff}
        
    if module and module != "ALL":
        query["module"] = {"$regex": f"^{module}$", "$options": "i"}
        
    if status and status != "ALL":
        query["status"] = status.upper()

    requests = list(db.approval_requests.find(query))
    
    # 2. Compute basic KPIs
    total = len(requests)
    pending = sum(1 for r in requests if r.get("status") == "PENDING")
    approved = sum(1 for r in requests if r.get("status") == "APPROVED")
    rejected = sum(1 for r in requests if r.get("status") == "REJECTED")
    
    # 3. Status distribution
    status_counts = {"PENDING": 0, "APPROVED": 0, "REJECTED": 0}
    for r in requests:
        st = r.get("status", "PENDING").upper()
        if st in status_counts:
            status_counts[st] += 1
        else:
            status_counts[st] = 1
            
    status_distribution = [{"status": k, "count": v} for k, v in status_counts.items()]
    
    # 4. Approvals by module
    module_counts = {}
    for r in requests:
        mod = r.get("module", "OTHER").upper()
        module_counts[mod] = module_counts.get(mod, 0) + 1
        
    approvals_by_module = [{"module": k, "count": v} for k, v in module_counts.items()]
    
    # 5. Approvals over time (grouped by date)
    by_date = {}
    for r in requests:
        created = r.get("created_at")
        if not created:
            continue
        date_str = created.strftime("%Y-%m-%d")
        if date_str not in by_date:
            by_date[date_str] = {"pending": 0, "approved": 0, "rejected": 0}
        
        st = r.get("status", "PENDING").upper()
        if st == "PENDING":
            by_date[date_str]["pending"] += 1
        elif st == "APPROVED":
            by_date[date_str]["approved"] += 1
        elif st == "REJECTED":
            by_date[date_str]["rejected"] += 1
            
    sorted_dates = sorted(by_date.keys())
    approvals_over_time = [
        {
            "date": d,
            "pending": by_date[d]["pending"],
            "approved": by_date[d]["approved"],
            "rejected": by_date[d]["rejected"]
        }
        for d in sorted_dates
    ]
    
    # 6. Avg approval hours
    req_ids = [r["_id"] for r in requests]
    steps = list(db.approval_steps.find({"approval_request_id": {"$in": req_ids}}))
    
    steps_by_req = {}
    for s in steps:
        req_id = s["approval_request_id"]
        if req_id not in steps_by_req:
            steps_by_req[req_id] = []
        steps_by_req[req_id].append(s)
        
    durations = []
    sla_breached_count = 0
    SLA_HOURS = 24.0
    
    for r in requests:
        req_id = r["_id"]
        req_created = r.get("created_at")
        req_status = r.get("status", "PENDING")
        req_steps = steps_by_req.get(req_id, [])
        
        if req_status == "APPROVED":
            approved_steps = [s for s in req_steps if s.get("status") == "APPROVED" and s.get("acted_at")]
            if approved_steps:
                last_acted = max(s["acted_at"] for s in approved_steps)
                diff = last_acted - req_created
                durations.append(diff.total_seconds() / 3600.0)
        elif req_status == "PENDING":
            diff = datetime.utcnow() - req_created
            if (diff.total_seconds() / 3600.0) > SLA_HOURS:
                sla_breached_count += 1
                
    avg_approval_hours = sum(durations) / len(durations) if durations else 0.0
    
    total_breached = 0
    for r in requests:
        req_id = r["_id"]
        req_created = r.get("created_at")
        req_status = r.get("status", "PENDING")
        req_steps = steps_by_req.get(req_id, [])
        
        if req_status == "PENDING":
            diff = datetime.utcnow() - req_created
            if (diff.total_seconds() / 3600.0) > SLA_HOURS:
                total_breached += 1
        else:
            acted_steps = [s for s in req_steps if s.get("acted_at")]
            if acted_steps:
                last_acted = max(s["acted_at"] for s in acted_steps)
                diff = last_acted - req_created
                if (diff.total_seconds() / 3600.0) > SLA_HOURS:
                    total_breached += 1

    sla_breach_percent = int(round((total_breached / total) * 100)) if total > 0 else 0
    
    return {
        "success": True,
        "data": {
            "total": total,
            "pending": pending,
            "approved": approved,
            "rejected": rejected,
            "status_distribution": status_distribution,
            "approvals_by_module": approvals_by_module,
            "approvals_over_time": approvals_over_time,
            "avg_approval_hours": round(avg_approval_hours, 1),
            "sla_breach_percent": sla_breach_percent,
            "sla_breached_count": sla_breached_count
        },
        "error": None
    }
