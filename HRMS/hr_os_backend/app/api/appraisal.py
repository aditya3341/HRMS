"""Appraisal & Promotion API — native MongoDB."""

from datetime import datetime, timedelta
from uuid import uuid4
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.mongodb import get_mongo_db
from app.auth.deps import get_current_user
from app.auth.constants import Permissions
from app.auth.permission import require_permission

router = APIRouter(tags=["performance-actions"])


class AppraisalUpdate(BaseModel):
    increment_percentage: float
    reason: str


class PromotionPropose(BaseModel):
    employee_id: str
    proposed_designation: str
    promotion_reason: str
    review_id: Optional[str] = None


@router.get("/appraisals")
def list_appraisals(
    cycle_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_mongo_db()
    # Find all reviews for this cycle
    reviews = list(db.reviews.find({"cycle_id": cycle_id}))
    review_ids = [r["_id"] for r in reviews]

    # Find appraisals linked to these reviews
    appraisals = list(db.appraisal_records.find({"review_id": {"$in": review_ids}}))

    result = []
    for app in appraisals:
        emp = db.employees.find_one({"_id": app.get("employee_id")})
        app.pop("_id", None)
        app["employee_name"] = emp.get("full_name") if emp else "Unknown"
        app["designation"] = emp.get("designation") if emp else ""
        if "effective_date" in app and hasattr(app["effective_date"], "isoformat"):
            app["effective_date"] = app["effective_date"].isoformat()
        result.append(app)

    return {"success": True, "data": result, "error": None}


@router.post("/appraisal/generate/{cycle_id}")
def generate_recommendations(
    cycle_id: str,
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") not in ["HR_ADMIN", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="Only HR can generate bulk recommendations")

    db = get_mongo_db()
    reviews = list(db.reviews.find({"cycle_id": cycle_id, "status": "COMPLETED"}))

    records = []
    for r in reviews:
        # Check if recommendation already exists
        existing = db.appraisal_records.find_one({"review_id": r["_id"]})
        if existing:
            existing.pop("_id", None)
            records.append(existing)
            continue

        emp = db.employees.find_one({"_id": r["employee_id"]})
        if not emp:
            continue

        sal = db.salary_structures.find_one({"employee_id": emp["_id"], "is_active": True})
        current_gross = sal.get("gross", 0) if sal else 0

        # Simple recommendation rule: rating >= 4.5 -> 15%, rating >= 4.0 -> 10%, else 5%
        rating = r.get("final_rating", 0.0)
        pct = 5.0
        if rating >= 4.5:
            pct = 15.0
        elif rating >= 4.0:
            pct = 10.0

        new_gross = round(current_gross * (1 + pct / 100))

        aid = str(uuid4())
        doc = {
            "_id": aid,
            "id": aid,
            "review_id": r["_id"],
            "employee_id": emp["_id"],
            "current_gross": current_gross,
            "proposed_gross": new_gross,
            "increment_percentage": pct,
            "status": "DRAFT",
            "reason": f"AI Recommendation based on review rating {rating}",
            "effective_date": datetime.utcnow() + timedelta(days=30),
        }
        db.appraisal_records.insert_one(doc)
        doc.pop("_id", None)
        records.append(doc)

    return {"success": True, "data": records, "error": None}


@router.patch("/appraisal/{appraisal_id}/update")
def update_appraisal(
    appraisal_id: str,
    payload: AppraisalUpdate,
    current_user: dict = Depends(get_current_user),
):
    db = get_mongo_db()
    app = db.appraisal_records.find_one({"_id": appraisal_id})
    if not app:
        raise HTTPException(status_code=404, detail="Appraisal record not found")

    new_gross = round(app.get("current_gross", 0) * (1 + payload.increment_percentage / 100))

    db.appraisal_records.update_one({"_id": appraisal_id}, {"$set": {
        "increment_percentage": payload.increment_percentage,
        "proposed_gross": new_gross,
        "reason": payload.reason,
        "updated_by": current_user["user_id"],
    }})

    return {"success": True, "data": {"message": "Appraisal updated successfully"}, "error": None}


@router.post("/appraisal/{appraisal_id}/lock")
def lock_appraisal(
    appraisal_id: str,
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") not in ["HR_ADMIN", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="Only HR can lock appraisal results")

    db = get_mongo_db()
    app = db.appraisal_records.find_one({"_id": appraisal_id})
    if not app:
        raise HTTPException(status_code=404, detail="Appraisal record not found")

    db.appraisal_records.update_one({"_id": appraisal_id}, {"$set": {
        "status": "LOCKED",
        "locked_by": current_user["user_id"],
        "locked_at": datetime.utcnow(),
    }})

    # Apply salary change to salary_structures
    sal = db.salary_structures.find_one({"employee_id": app["employee_id"], "is_active": True})
    if sal:
        # deactivate old
        db.salary_structures.update_one({"_id": sal["_id"]}, {"$set": {"is_active": False}})

        # insert new
        sid = str(uuid4())
        pct = 1 + app["increment_percentage"] / 100
        db.salary_structures.insert_one({
            "_id": sid,
            "id": sid,
            "entity_id": sal.get("entity_id"),
            "employee_id": app["employee_id"],
            "basic": round(sal.get("basic", 0) * pct),
            "hra": round(sal.get("hra", 0) * pct),
            "da": round(sal.get("da", 0) * pct),
            "special_allowance": round(sal.get("special_allowance", 0) * pct),
            "gross": app["proposed_gross"],
            "pf_deduction": round(sal.get("pf_deduction", 0) * pct),
            "tax_deduction": round(sal.get("tax_deduction", 0) * pct),
            "effective_from": datetime.utcnow(),
            "is_active": True,
        })

    return {"success": True, "data": {"message": "Appraisal locked and applied"}, "error": None}


@router.get("/promotion/evaluate/{employee_id}")
def evaluate_promotion(
    employee_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_mongo_db()
    # Evaluate promo eligibility: rating >= 4.0 in latest review
    latest_review = db.reviews.find_one({"employee_id": employee_id, "status": "COMPLETED"}, sort=[("created_at", -1)])
    rating = latest_review.get("final_rating", 0.0) if latest_review else 0.0
    eligible = rating >= 4.0

    return {
        "success": True,
        "data": {
            "eligible": eligible,
            "rating": rating,
            "reason": "Rating >= 4.0 in current cycle" if eligible else "Requires rating of 4.0 or higher",
        },
        "error": None,
    }


@router.post("/promotion/propose")
def propose_promotion(
    payload: PromotionPropose,
    current_user: dict = Depends(get_current_user),
):
    db = get_mongo_db()
    pid = str(uuid4())
    doc = {
        "_id": pid,
        "id": pid,
        "employee_id": payload.employee_id,
        "proposed_designation": payload.proposed_designation,
        "promotion_reason": payload.promotion_reason,
        "review_id": payload.review_id,
        "status": "PENDING",
        "proposed_by": current_user["user_id"],
        "created_at": datetime.utcnow(),
    }
    db.promotion_records.insert_one(doc)
    doc.pop("_id", None)
    doc["created_at"] = doc["created_at"].isoformat()
    return {"success": True, "data": doc, "error": None}


@router.post("/promotion/{promotion_id}/approve")
def approve_promotion(
    promotion_id: str,
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") not in ["HR_ADMIN", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="Only HR can approve promotions")

    db = get_mongo_db()
    promo = db.promotion_records.find_one({"_id": promotion_id})
    if not promo:
        raise HTTPException(status_code=404, detail="Promotion record not found")

    db.promotion_records.update_one({"_id": promotion_id}, {"$set": {
        "status": "APPROVED",
        "approved_by": current_user["user_id"],
        "approved_at": datetime.utcnow(),
    }})

    # Update employee's designation
    db.employees.update_one({"_id": promo["employee_id"]}, {"$set": {"designation": promo["proposed_designation"]}})

    return {"success": True, "data": {"message": "Promotion approved and applied"}, "error": None}


@router.get("/promotions")
def list_promotions(
    cycle_id: str | None = None,
    current_user: dict = Depends(get_current_user),
):
    db = get_mongo_db()
    filt = {}
    if cycle_id:
        reviews = list(db.reviews.find({"cycle_id": cycle_id}))
        review_ids = [r["_id"] for r in reviews]
        filt["review_id"] = {"$in": review_ids}

    promotions = list(db.promotion_records.find(filt).sort("created_at", -1))
    result = []
    for p in promotions:
        emp = db.employees.find_one({"_id": p.get("employee_id")})
        p.pop("_id", None)
        p["employee_name"] = emp.get("full_name") if emp else "Unknown"
        p["current_designation"] = emp.get("designation") if emp else ""
        if "created_at" in p and hasattr(p["created_at"], "isoformat"):
            p["created_at"] = p["created_at"].isoformat()
        result.append(p)

    return {"success": True, "data": result, "error": None}
