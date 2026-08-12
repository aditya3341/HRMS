"""IT Assets API — native MongoDB."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime
from uuid import uuid4
from typing import Optional, List

from app.core.mongodb import get_mongo_db
from app.auth.deps import get_current_user
from app.auth.constants import Permissions
from app.auth.permission import require_permission

router = APIRouter(prefix="/it-assets", tags=["IT Assets"])


@router.get("/", dependencies=[Depends(require_permission(Permissions.ASSET_READ))])
@router.get("", dependencies=[Depends(require_permission(Permissions.ASSET_READ))])
def list_assets(current_user=Depends(get_current_user), status: str | None = None):
    db = get_mongo_db()
    entity_id = current_user["entity_id"]
    
    docs = []
    
    # 1. Fetch from both collections
    f1: dict = {"entity_id": entity_id}
    if status:
        f1["status"] = status.upper()
    docs.extend(list(db.it_assets.find(f1)))
    docs.extend(list(db["IT Assets"].find(f1)))
    
    f2: dict = {}
    if status:
        f2["status"] = status.upper()
    extra_docs = list(db["IT Assets"].find(f2))
    
    # Merge and remove duplicates by _id
    seen_ids = {d["_id"] for d in docs}
    for d in extra_docs:
        if d["_id"] not in seen_ids:
            docs.append(d)
            seen_ids.add(d["_id"])

    seen_serials = set()
    result = []
    for a in docs:
        serial = a.get("serial_number") or a.get("asset_tag")
        if serial in seen_serials:
            continue
        if serial:
            seen_serials.add(serial)
            
        assigned_name = a.get("assigned_to_name")
        if not assigned_name and a.get("assigned_to"):
            emp = db.employees.find_one({"_id": a["assigned_to"]})
            assigned_name = emp.get("full_name") if emp else None
            
        name = a.get("name") or a.get("desktop_name") or f"{a.get('brand', '')} {a.get('model', '')}".strip() or a.get("asset_tag") or "Unnamed Asset"
        asset_type = a.get("asset_type") or "Desktop/Laptop"
        status_val = a.get("status", "AVAILABLE").upper()
        
        pdate = None
        if a.get("purchase_date"):
            if hasattr(a["purchase_date"], "isoformat"):
                pdate = a["purchase_date"].isoformat()
            else:
                pdate = str(a["purchase_date"])
        
        # Ensure all columns required by ITAssets.tsx are explicitly populated
        result.append({
            "id": a.get("id", str(a["_id"])),
            "brand": a.get("brand") or "",
            "model": a.get("model") or "",
            "asset_tag": serial or "",
            "asset_type": asset_type,
            "desktop_name": name,
            "processor": a.get("processor") or "",
            "ram": a.get("ram") or "",
            "storage": a.get("storage") or "",
            "operating_system": a.get("operating_system") or "",
            "gpu": a.get("gpu") or "",
            "location": a.get("location") or "Office",
            "status": status_val,
            "assigned_to": a.get("assigned_to") or "",
            "assigned_to_name": assigned_name or "",
            "issue": a.get("notes") or a.get("issue") or "",
            "purchase_date": pdate,
        })
        
    return {"success": True, "data": result, "error": None}


# ── Stock Management Endpoints ─────────────────────────────────

class StockItemCreate(BaseModel):
    category: str
    item_name: str
    brand_model: str = ""
    total_stock: str = ""
    issued_qty: str = ""
    remaining_qty: str = ""
    issued_to: str = ""
    department: str = ""
    issue_date: str = ""
    unit: str = ""
    reorder_required: str = "No"

class StockItemUpdate(BaseModel):
    category: Optional[str] = None
    item_name: Optional[str] = None
    brand_model: Optional[str] = None
    total_stock: Optional[str] = None
    issued_qty: Optional[str] = None
    remaining_qty: Optional[str] = None
    issued_to: Optional[str] = None
    department: Optional[str] = None
    issue_date: Optional[str] = None
    unit: Optional[str] = None
    reorder_required: Optional[str] = None

@router.get("/stock")
@router.get("/stock/")
def list_stock(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    entity_id = current_user["entity_id"]
    items = list(db.it_stock.find({"entity_id": entity_id}).sort("item_name", 1))
    for item in items:
        item["id"] = str(item.pop("_id", item.get("id")))
        if "created_at" in item and hasattr(item["created_at"], "isoformat"):
            item["created_at"] = item["created_at"].isoformat()
    return {"success": True, "data": items, "error": None}

@router.post("/stock")
@router.post("/stock/")
def create_stock_item(payload: StockItemCreate, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    stock_id = str(uuid4())
    doc = {
        "_id": stock_id,
        "id": stock_id,
        "entity_id": current_user["entity_id"],
        "category": payload.category,
        "item_name": payload.item_name,
        "brand_model": payload.brand_model,
        "total_stock": payload.total_stock,
        "issued_qty": payload.issued_qty,
        "remaining_qty": payload.remaining_qty,
        "issued_to": payload.issued_to,
        "department": payload.department,
        "issue_date": payload.issue_date,
        "unit": payload.unit,
        "reorder_required": payload.reorder_required,
        "created_at": datetime.utcnow()
    }
    db.it_stock.insert_one(doc)
    doc.pop("_id", None)
    doc["created_at"] = doc["created_at"].isoformat()
    return {"success": True, "data": doc, "error": None}

@router.put("/stock/{stock_id}")
@router.patch("/stock/{stock_id}")
def update_stock_item(stock_id: str, payload: StockItemUpdate, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    updates = {}
    p_dict = payload.dict(exclude_unset=True)
    for k, v in p_dict.items():
        if v is not None:
            updates[k] = v
            
    if updates:
        db.it_stock.update_one({"_id": stock_id}, {"$set": updates})
        
    return {"success": True, "data": {"message": "Stock item updated"}, "error": None}

@router.delete("/stock/{stock_id}")
def delete_stock_item(stock_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    db.it_stock.delete_one({"_id": stock_id})
    return {"success": True, "data": {"message": "Stock item deleted"}, "error": None}


@router.get("/{asset_id}", dependencies=[Depends(require_permission(Permissions.ASSET_READ))])
def get_asset(asset_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    a = db.it_assets.find_one({"_id": asset_id})
    if not a:
        a = db["IT Assets"].find_one({"_id": asset_id})
    if not a:
        a = db.it_assets.find_one({"id": asset_id})
    if not a:
        a = db["IT Assets"].find_one({"id": asset_id})
        
    if not a:
        raise HTTPException(404, "Asset not found")
        
    name = a.get("name") or a.get("desktop_name") or f"{a.get('brand', '')} {a.get('model', '')}".strip() or a.get("asset_tag") or "Unnamed Asset"
    serial = a.get("serial_number") or a.get("asset_tag")
    
    res = {
        "id": a.get("id", str(a["_id"])),
        "brand": a.get("brand") or "",
        "model": a.get("model") or "",
        "asset_tag": serial or "",
        "asset_type": a.get("asset_type") or "Desktop/Laptop",
        "desktop_name": name,
        "processor": a.get("processor") or "",
        "ram": a.get("ram") or "",
        "storage": a.get("storage") or "",
        "operating_system": a.get("operating_system") or "",
        "gpu": a.get("gpu") or "",
        "location": a.get("location") or "Office",
        "status": a.get("status", "AVAILABLE").upper(),
        "assigned_to": a.get("assigned_to") or "",
        "issue": a.get("notes") or a.get("issue") or "",
    }
    
    for key in ["purchase_date", "warranty_end"]:
        if key in a:
            if hasattr(a[key], "isoformat"):
                res[key] = a[key].isoformat()
            else:
                res[key] = str(a[key])
                
    return {"success": True, "data": res, "error": None}


@router.post("/", dependencies=[Depends(require_permission(Permissions.ASSET_MANAGE))])
@router.post("", dependencies=[Depends(require_permission(Permissions.ASSET_MANAGE))])
def create_asset(payload: dict, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    aid = str(uuid4())
    doc = {
        "_id": aid,
        "id": aid,
        "entity_id": current_user["entity_id"],
        "created_at": datetime.utcnow(),
        **payload
    }
    db.it_assets.insert_one(doc)
    doc.pop("_id", None)
    return {"success": True, "data": doc, "error": None}


@router.put("/{asset_id}", dependencies=[Depends(require_permission(Permissions.ASSET_MANAGE))])
@router.patch("/{asset_id}", dependencies=[Depends(require_permission(Permissions.ASSET_MANAGE))])
def update_asset(asset_id: str, payload: dict, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    updates = {k: v for k, v in payload.items() if v is not None}
    
    if "assigned_to_name" in updates:
        name = updates["assigned_to_name"].strip()
        if not name or name.lower() in ["none", "n/a", "available", "unassigned"]:
            updates["assigned_to_name"] = ""
            updates["assigned_to"] = None
            updates["status"] = "AVAILABLE"
        else:
            # Resolve employee
            emp = db.employees.find_one({"full_name": {"$regex": f"^{name}$", "$options": "i"}})
            if not emp:
                emp = db.employees.find_one({"full_name": {"$regex": name, "$options": "i"}})
            if emp:
                updates["assigned_to"] = str(emp["_id"])
                updates["assigned_to_name"] = emp["full_name"]
                updates["status"] = "ASSIGNED"
            else:
                # Create a new user & employee dynamically
                uid = str(uuid4())
                eid = str(uuid4())
                email = f"{name.lower().replace(' ', '.')}@zipaworld.com"
                
                if not db.users.find_one({"email": email}):
                    db.users.insert_one({
                        "_id": uid, "id": uid,
                        "email": email,
                        "hashed_password": "$2b$12$f3Dyvsc/FpWqHF4f.MtTgOx0b3eDFfG105Oz9QTdBbCIuMmGO.dW6",
                        "password_hash": "$2b$12$f3Dyvsc/FpWqHF4f.MtTgOx0b3eDFfG105Oz9QTdBbCIuMmGO.dW6",
                        "role": "EMPLOYEE",
                        "entity_id": current_user["entity_id"],
                        "employee_id": eid,
                    })
                    db.employees.insert_one({
                        "_id": eid, "id": eid,
                        "user_id": uid,
                        "entity_id": current_user["entity_id"],
                        "employee_code": f"EXP-USR-{str(uuid4())[:6].upper()}",
                        "full_name": name,
                        "email": email,
                        "designation": "Staff",
                        "status": "ACTIVE",
                    })
                updates["assigned_to"] = eid
                updates["status"] = "ASSIGNED"
                
    if "status" in updates:
        updates["status"] = updates["status"].upper()
        
    if updates:
        db.it_assets.update_one({"_id": asset_id}, {"$set": updates})
        db["IT Assets"].update_one({"_id": asset_id}, {"$set": updates})
        
    return {"success": True, "data": {"message": "Asset updated"}, "error": None}


@router.post("/{asset_id}/assign", dependencies=[Depends(require_permission(Permissions.ASSET_MANAGE))])
def assign_asset(asset_id: str, payload: dict, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    employee_id = payload.get("employee_id")
    db.it_assets.update_one({"_id": asset_id}, {"$set": {"assigned_to": employee_id, "status": "ASSIGNED"}})
    db["IT Assets"].update_one({"_id": asset_id}, {"$set": {"assigned_to": employee_id, "status": "ASSIGNED"}})
    return {"success": True, "data": {"message": "Asset assigned"}, "error": None}


@router.post("/{asset_id}/unassign", dependencies=[Depends(require_permission(Permissions.ASSET_MANAGE))])
def unassign_asset(asset_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    db.it_assets.update_one({"_id": asset_id}, {"$set": {"assigned_to": None, "status": "AVAILABLE"}})
    db["IT Assets"].update_one({"_id": asset_id}, {"$set": {"assigned_to": None, "status": "AVAILABLE"}})
    return {"success": True, "data": {"message": "Asset unassigned"}, "error": None}


@router.delete("/{asset_id}", dependencies=[Depends(require_permission(Permissions.ASSET_MANAGE))])
def delete_asset(asset_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    db.it_assets.delete_one({"_id": asset_id})
    db["IT Assets"].delete_one({"_id": asset_id})
    return {"success": True, "data": {"message": "Asset deleted"}, "error": None}