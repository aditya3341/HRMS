"""Performance API — native MongoDB."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime
from uuid import uuid4
from typing import Optional, List

from app.core.mongodb import get_mongo_db
from app.auth.deps import get_current_user
from app.auth.constants import Permissions
from app.auth.permission import require_permission
from app.utils.abac import get_accessible_employee_ids

router = APIRouter(tags=["Performance"])


class CycleCreate(BaseModel):
    name: str
    cycle_type: str = "ANNUAL"
    start_date: str
    end_date: str


class KPACreate(BaseModel):
    name: str
    description: str = ""
    weightage: float = 0
    cycle_id: str | None = None


class GoalCreate(BaseModel):
    title: str
    description: str = ""
    kpa_id: str | None = None
    cycle_id: str | None = None
    target: str = ""


class GoalItem(BaseModel):
    title: str
    description: str = ""
    weightage: float = 0
    kpa_id: Optional[str] = None
    kra_id: Optional[str] = None
    target_value: Optional[str] = None


class GoalBundleSave(BaseModel):
    cycle_id: str
    items: List[GoalItem]


class ReviewCreate(BaseModel):
    employee_id: str
    cycle_id: str


class ReviewSubmit(BaseModel):
    rating: float = 0
    comments: str = ""


class ReviewResponsesSubmit(BaseModel):
    responses: List[dict]


# ── Cycles ────────────────────────────────────────────────────
@router.get("/cycles")
def list_cycles(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    cycles = list(db.performance_cycles.find({"entity_id": current_user["entity_id"]}).sort("start_date", -1))
    for c in cycles:
        c.pop("_id", None)
        c["type"] = c.get("cycle_type", "ANNUAL")
        for key in ["start_date", "end_date", "created_at"]:
            if key in c and hasattr(c[key], "isoformat"):
                c[key] = c[key].isoformat()
    return {"success": True, "data": cycles, "error": None}


@router.post("/cycles", dependencies=[Depends(require_permission(Permissions.PERFORMANCE_ADMIN))])
def create_cycle(payload: CycleCreate, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    cid = str(uuid4())
    doc = {
        "_id": cid, "id": cid, "entity_id": current_user["entity_id"],
        "name": payload.name, "cycle_type": payload.cycle_type.upper(),
        "type": payload.cycle_type.upper(),
        "start_date": datetime.strptime(payload.start_date, "%Y-%m-%d"),
        "end_date": datetime.strptime(payload.end_date, "%Y-%m-%d"),
        "status": "DRAFT", "created_at": datetime.utcnow(),
    }
    db.performance_cycles.insert_one(doc)
    doc.pop("_id", None)
    for key in ["start_date", "end_date", "created_at"]:
        if key in doc and hasattr(doc[key], "isoformat"):
            doc[key] = doc[key].isoformat()
    return {"success": True, "data": doc, "error": None}


@router.patch("/cycles/{cycle_id}/activate", dependencies=[Depends(require_permission(Permissions.PERFORMANCE_ADMIN))])
def activate_cycle(cycle_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    db.performance_cycles.update_one({"_id": cycle_id}, {"$set": {"status": "ACTIVE"}})
    return {"success": True, "data": {"message": "Cycle activated"}, "error": None}


@router.patch("/cycles/{cycle_id}/close", dependencies=[Depends(require_permission(Permissions.PERFORMANCE_ADMIN))])
def close_cycle(cycle_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    db.performance_cycles.update_one({"_id": cycle_id}, {"$set": {"status": "CLOSED"}})
    return {"success": True, "data": {"message": "Cycle closed"}, "error": None}


# ── KPAs ──────────────────────────────────────────────────────
@router.get("/kpa")
@router.get("/kpas")
def list_kpas(current_user=Depends(get_current_user), cycle_id: str | None = None):
    db = get_mongo_db()
    filt: dict = {"entity_id": current_user["entity_id"]}
    if cycle_id:
        filt["cycle_id"] = cycle_id
    kpas = list(db.kpas.find(filt))
    for k in kpas:
        k.pop("_id", None)
    return {"success": True, "data": kpas, "error": None}


@router.post("/kpas", dependencies=[Depends(require_permission(Permissions.PERFORMANCE_ADMIN))])
def create_kpa(payload: KPACreate, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    kid = str(uuid4())
    doc = {
        "_id": kid, "id": kid, "entity_id": current_user["entity_id"],
        "name": payload.name, "description": payload.description,
        "weightage": payload.weightage, "cycle_id": payload.cycle_id,
    }
    db.kpas.insert_one(doc)
    doc.pop("_id", None)
    return {"success": True, "data": doc, "error": None}


# ── Goals ─────────────────────────────────────────────────────
@router.get("/goals/my")
def get_my_goals_api(cycle_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    emp = db.employees.find_one({"user_id": current_user["user_id"], "entity_id": current_user["entity_id"]})
    if not emp:
        return {"success": True, "data": {"id": "", "status": "DRAFT", "items": []}, "error": None}

    doc = db.goals.find_one({"employee_id": emp["_id"], "cycle_id": cycle_id})
    if not doc:
        return {"success": True, "data": {"id": "", "status": "DRAFT", "items": []}, "error": None}

    doc["id"] = doc["_id"]
    doc.pop("_id", None)
    return {"success": True, "data": doc, "error": None}


@router.get("/goals")
def list_my_goals(current_user=Depends(get_current_user), cycle_id: str | None = None):
    db = get_mongo_db()
    emp = db.employees.find_one({"user_id": current_user["user_id"], "entity_id": current_user["entity_id"]})
    if not emp:
        return {"success": True, "data": [], "error": None}
    filt: dict = {"employee_id": emp["_id"]}
    if cycle_id:
        filt["cycle_id"] = cycle_id
    goals = list(db.goals.find(filt))
    for g in goals:
        g.pop("_id", None)
    return {"success": True, "data": goals, "error": None}


@router.post("/goals")
def save_my_goals(payload: GoalBundleSave, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    emp = db.employees.find_one({"user_id": current_user["user_id"], "entity_id": current_user["entity_id"]})
    if not emp:
        raise HTTPException(404, "Employee record not found")

    # Check if a goals bundle document already exists
    existing = db.goals.find_one({"employee_id": emp["_id"], "cycle_id": payload.cycle_id})

    items_dict = [it.dict() for it in payload.items]
    total_weight = sum(it.weightage for it in payload.items)

    doc_data = {
        "items": items_dict,
        "total_weightage": total_weight,
        "updated_at": datetime.utcnow(),
    }

    if existing:
        if existing.get("status") in ("SUBMITTED", "APPROVED"):
            raise HTTPException(400, f"Cannot save goals that are already {existing.get('status')}")

        db.goals.update_one({"_id": existing["_id"]}, {"$set": doc_data})
        gid = existing["_id"]
    else:
        gid = str(uuid4())
        db.goals.insert_one({
            "_id": gid,
            "id": gid,
            "entity_id": current_user["entity_id"],
            "employee_id": emp["_id"],
            "cycle_id": payload.cycle_id,
            "status": "DRAFT",
            "manager_id": emp.get("manager_id"),
            "created_at": datetime.utcnow(),
            **doc_data
        })

    return {"success": True, "data": {"id": gid, "message": "Goals saved"}, "error": None}


@router.post("/goals/submit")
def submit_goals(goal_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    db.goals.update_one({"_id": goal_id}, {"$set": {"status": "SUBMITTED"}})
    return {"success": True, "data": {"message": "Goals submitted successfully"}, "error": None}


@router.post("/goals/{goal_id}/approve")
def approve_goals_api(goal_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    db.goals.update_one({"_id": goal_id}, {"$set": {"status": "APPROVED"}})
    return {"success": True, "data": {"message": "Goals approved successfully"}, "error": None}


# ── Team management ───────────────────────────────────────────
@router.get("/team/goals")
def get_team_goals(cycle_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    entity_id = current_user["entity_id"]
    emp = db.employees.find_one({"user_id": current_user["user_id"], "entity_id": entity_id})
    emp_id = emp["_id"] if emp else current_user["user_id"]

    is_admin = current_user.get("role") in ("SUPER_ADMIN", "HR_ADMIN")

    filt = {"cycle_id": cycle_id, "entity_id": entity_id, "status": "SUBMITTED"}
    if not is_admin:
        filt["manager_id"] = emp_id

    goals = list(db.goals.find(filt))
    result = []
    for g in goals:
        e = db.employees.find_one({"_id": g.get("employee_id")})
        if not e:
            continue

        full_name = e.get("full_name", "")
        parts = full_name.split(" ", 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ""

        result.append({
            "id": g["_id"],
            "employee_id": g.get("employee_id"),
            "status": g.get("status"),
            "items": g.get("items", []),
            "total_weightage": g.get("total_weightage", 0),
            "employee": {
                "first_name": first_name,
                "last_name": last_name,
                "designation": e.get("designation", "")
            }
        })
    return {"success": True, "data": result, "error": None}


@router.get("/team/reviews")
def get_team_reviews(cycle_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    entity_id = current_user["entity_id"]
    emp = db.employees.find_one({"user_id": current_user["user_id"], "entity_id": entity_id})
    emp_id = emp["_id"] if emp else current_user["user_id"]

    is_admin = current_user.get("role") in ("SUPER_ADMIN", "HR_ADMIN")

    filt = {"cycle_id": cycle_id, "entity_id": entity_id}
    if not is_admin:
        filt["manager_id"] = emp_id

    reviews = list(db.reviews.find(filt))
    result = []
    for r in reviews:
        e = db.employees.find_one({"_id": r.get("employee_id")})
        if not e:
            continue

        full_name = e.get("full_name", "")
        parts = full_name.split(" ", 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ""

        result.append({
            "id": r["_id"],
            "employee_id": r.get("employee_id"),
            "cycle_id": r.get("cycle_id"),
            "status": r.get("status"),
            "current_step": r.get("status"),
            "self_rating": r.get("self_rating", 0),
            "manager_rating": r.get("manager_rating", 0),
            "final_rating": r.get("final_rating", 0),
            "employee_name": e.get("full_name", ""),
            "employee": {
                "first_name": first_name,
                "last_name": last_name,
                "designation": e.get("designation", "")
            }
        })
    return {"success": True, "data": result, "error": None}


# ── Reviews ───────────────────────────────────────────────────
@router.post("/review/start")
def start_review_api(employee_id: str, cycle_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    existing = db.reviews.find_one({"employee_id": employee_id, "cycle_id": cycle_id})
    if existing:
        return {"success": True, "data": {"id": existing["_id"]}, "error": None}

    emp = db.employees.find_one({"_id": employee_id})
    rid = str(uuid4())
    doc = {
        "_id": rid,
        "id": rid,
        "entity_id": current_user["entity_id"],
        "employee_id": employee_id,
        "cycle_id": cycle_id,
        "manager_id": emp.get("manager_id") if emp else None,
        "status": "IN_PROGRESS",
        "self_rating": 0,
        "manager_rating": 0,
        "final_rating": 0,
        "created_at": datetime.utcnow(),
    }
    db.reviews.insert_one(doc)
    return {"success": True, "data": {"id": rid}, "error": None}


@router.post("/review/self")
def post_self_review(review_id: str, payload: ReviewResponsesSubmit, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    ratings = [float(r.get("rating")) for r in payload.responses if r.get("rating") is not None]
    avg_rating = sum(ratings) / len(ratings) if ratings else 4.0

    db.reviews.update_one({"_id": review_id}, {"$set": {
        "self_rating": avg_rating,
        "self_responses": payload.responses,
        "self_submitted_at": datetime.utcnow()
    }})
    return {"success": True, "data": {"message": "Self-review submitted"}, "error": None}


@router.post("/review/manager")
def post_manager_review(review_id: str, payload: ReviewResponsesSubmit, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    ratings = [float(r.get("rating")) for r in payload.responses if r.get("rating") is not None]
    avg_rating = sum(ratings) / len(ratings) if ratings else 4.0

    db.reviews.update_one({"_id": review_id}, {"$set": {
        "manager_rating": avg_rating,
        "manager_responses": payload.responses,
        "manager_submitted_at": datetime.utcnow(),
        "status": "COMPLETED",
        "final_rating": avg_rating
    }})
    return {"success": True, "data": {"message": "Manager review submitted"}, "error": None}


@router.get("/reviews")
def list_reviews(current_user=Depends(get_current_user), cycle_id: str | None = None):
    db = get_mongo_db()
    accessible_ids = get_accessible_employee_ids(db, current_user)
    filt: dict = {"employee_id": {"$in": accessible_ids}}
    if cycle_id:
        filt["cycle_id"] = cycle_id
    reviews = list(db.reviews.find(filt).sort("created_at", -1))
    for r in reviews:
        r.pop("_id", None)
        emp = db.employees.find_one({"_id": r.get("employee_id")})
        r["employee_name"] = emp.get("full_name") if emp else "Unknown"
        for key in ["created_at"]:
            if key in r and hasattr(r[key], "isoformat"):
                r[key] = r[key].isoformat()
    return {"success": True, "data": reviews, "error": None}


@router.get("/reviews/{review_id}")
def get_review(review_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    review = db.reviews.find_one({"_id": review_id})
    if not review:
        raise HTTPException(404, "Review not found")
    review.pop("_id", None)
    emp = db.employees.find_one({"_id": review.get("employee_id")})
    review["employee_name"] = emp.get("full_name") if emp else "Unknown"

    steps = list(db.review_steps.find({"review_id": review_id}))
    for s in steps:
        s.pop("_id", None)
    review["steps"] = steps

    goals = list(db.goals.find({"employee_id": review.get("employee_id"), "cycle_id": review.get("cycle_id")}))
    for g in goals:
        g.pop("_id", None)
    review["goals"] = goals
    for key in ["created_at"]:
        if key in review and hasattr(review[key], "isoformat"):
            review[key] = review[key].isoformat()
    return {"success": True, "data": review, "error": None}


@router.post("/reviews", dependencies=[Depends(require_permission(Permissions.PERFORMANCE_MANAGE))])
def create_review(payload: ReviewCreate, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    rid = str(uuid4())
    emp = db.employees.find_one({"_id": payload.employee_id})
    doc = {
        "_id": rid, "id": rid, "entity_id": current_user["entity_id"],
        "employee_id": payload.employee_id,
        "cycle_id": payload.cycle_id,
        "manager_id": emp.get("manager_id") if emp else None,
        "status": "IN_PROGRESS",
        "self_rating": 0, "manager_rating": 0, "final_rating": 0,
        "created_at": datetime.utcnow(),
    }
    db.reviews.insert_one(doc)
    doc.pop("_id", None)
    doc["created_at"] = doc["created_at"].isoformat()
    return {"success": True, "data": doc, "error": None}


@router.patch("/reviews/{review_id}/self-review")
def submit_self_review_patch(review_id: str, payload: ReviewSubmit, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    db.reviews.update_one({"_id": review_id}, {"$set": {
        "self_rating": payload.rating, "self_comments": payload.comments,
    }})
    return {"success": True, "data": {"message": "Self-review submitted"}, "error": None}


@router.patch("/reviews/{review_id}/manager-review", dependencies=[Depends(require_permission(Permissions.PERFORMANCE_MANAGE))])
def submit_manager_review_patch(review_id: str, payload: ReviewSubmit, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    db.reviews.update_one({"_id": review_id}, {"$set": {
        "manager_rating": payload.rating, "manager_comments": payload.comments,
    }})
    return {"success": True, "data": {"message": "Manager review submitted"}, "error": None}


@router.patch("/reviews/{review_id}/complete", dependencies=[Depends(require_permission(Permissions.PERFORMANCE_MANAGE))])
def complete_review(review_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    review = db.reviews.find_one({"_id": review_id})
    if not review:
        raise HTTPException(404, "Review not found")
    final = round((review.get("self_rating", 0) * 0.3 + review.get("manager_rating", 0) * 0.7), 2)
    db.reviews.update_one({"_id": review_id}, {"$set": {"status": "COMPLETED", "final_rating": final}})
    return {"success": True, "data": {"message": "Review completed", "final_rating": final}, "error": None}


# ── Analytics ─────────────────────────────────────────────────
@router.get("/analytics")
def performance_analytics(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    accessible_ids = get_accessible_employee_ids(db, current_user)
    reviews = list(db.reviews.find({"employee_id": {"$in": accessible_ids}, "status": "COMPLETED"}))
    avg_rating = round(sum(r.get("final_rating", 0) for r in reviews) / max(len(reviews), 1), 2)
    return {"success": True, "data": {
        "total_reviews": len(reviews),
        "avg_rating": avg_rating,
    }, "error": None}
