"""AI Chatbot API — native MongoDB."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.mongodb import get_mongo_db
from app.auth.deps import get_current_user
from app.utils.ai_engine import GeminiEngine

router = APIRouter(prefix="/chat", tags=["AI Chatbot"])


class ChatPayload(BaseModel):
    message: str


@router.post("/query")
def chat_query(
    payload: ChatPayload,
    current_user: dict = Depends(get_current_user),
):
    import re
    message = payload.message.lower().strip()
    user_id = current_user["user_id"]
    role = current_user.get("role")
    entity_id = current_user["entity_id"]

    db = get_mongo_db()
    # Resolve Employee profile
    employee = db.employees.find_one({"user_id": user_id})
    if not employee:
        employee = db.employees.find_one({"email": current_user.get("email")})

    # Check if AI is enabled and configured
    config = GeminiEngine.get_config(db)
    ai_enabled = config.get("enabled", True)

    if ai_enabled:
        try:
            # 1. Fetch leave balances context
            balances_text = ""
            if employee:
                balances = list(db.leave_balances.find({"employee_id": employee["_id"]}))
                b_lines = []
                for b in balances:
                    lt = db.leave_types.find_one({"_id": b.get("leave_type_id")})
                    name = lt.get("name") if lt else "Leave"
                    b_lines.append(f"- {name}: {b.get('balance', 0)} remaining (of {b.get('entitled', 0)} entitled)")
                balances_text = "\n".join(b_lines) if b_lines else "No leave balances found."
            else:
                balances_text = "No employee profile found."

            # 2. Fetch recent IT tickets context
            tickets_text = ""
            tickets = list(db.tickets.find({"created_by": user_id}).sort("created_at", -1).limit(3))
            if tickets:
                t_lines = []
                for t in tickets:
                    created = t["created_at"].strftime("%Y-%m-%d") if hasattr(t["created_at"], "strftime") else str(t["created_at"])
                    t_lines.append(f"- Ticket: {t.get('title')} | Status: {t.get('status')} | Created: {created}")
                tickets_text = "\n".join(t_lines)
            else:
                tickets_text = "No recent IT tickets."

            # 3. Fetch monthly attendance summary context
            attendance_text = ""
            if employee:
                records = list(db.attendance.find({"employee_id": employee["_id"]}))
                present = sum(1 for r in records if r.get("status") in ("PRESENT", "LATE", "HALF_DAY"))
                late = sum(1 for r in records if r.get("is_late"))
                attendance_text = f"- Present Days: {present}\n- Late Arrivals: {late}"
            else:
                attendance_text = "No attendance records found."

            # 4. Fetch manager context (who is on leave today & pending approvals)
            manager_context = ""
            if role in ["MANAGER", "ADMIN", "SUPER_ADMIN", "HR_ADMIN", "HR"]:
                today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
                leaves = list(db.leave_requests.find({
                    "entity_id": entity_id,
                    "status": "APPROVED",
                    "start_date": {"$lte": today},
                    "end_date": {"$gte": today},
                }))
                on_leave = []
                for l in leaves:
                    emp = db.employees.find_one({"_id": l.get("employee_id")})
                    if emp:
                        on_leave.append(emp.get("full_name"))
                on_leave_str = ", ".join(on_leave) if on_leave else "None"
                
                pending_count = db.leave_requests.count_documents({
                    "entity_id": entity_id,
                    "status": "PENDING",
                })
                
                manager_context = f"\nMANAGER/ADMIN CONTEXT:\n- Team members on leave today: {on_leave_str}\n- Pending leave requests requiring your review: {pending_count}"

            # Construct the system prompt injecting all context
            system_prompt = f"""You are a versatile, intelligent AI Assistant (powered by Google Gemini/selected LLM) integrated into the HRMS portal for Zipaworld Technologies.
You are conversing with {current_user.get("email")} (Role: {role}).
Today's date is: {datetime.now().strftime("%Y-%m-%d %I:%M %p")} (Indian Standard Time).

Here is the real-time HRMS database context for this user:
---
PROFILE CONTEXT:
- Full Name: {employee.get("full_name") if employee else "Admin/User"}
- Email: {current_user.get("email")}
- Role: {role}
- Employee Code: {employee.get("employee_code") if employee else "N/A"}

LEAVE BALANCES:
{balances_text}

RECENT IT TICKETS:
{tickets_text}

MONTHLY ATTENDANCE SUMMARY:
{attendance_text}{manager_context}
---

Instructions:
1. You can answer ANY question the user asks (including general knowledge, coding, writing, mathematical queries, etc.) just like a standard Gemini chatbot.
2. If the user asks about their specific HRMS data (such as their leave balance, attendance status, profile info, or recent IT support tickets), answer using the real-time database context provided above.
3. If the user requests to apply for leave (e.g. sick leave, casual leave, take a day off), end your response with the exact tag: [ACTION:APPLY_LEAVE]
4. If the user requests to raise or create an IT/support ticket (e.g. raise an issue, log IT problem), end your response with the exact tag: [ACTION:RAISE_TICKET]
5. Keep your tone helpful, natural, and friendly. Respond in clean markdown formatting.
"""

            # Call configured AI provider
            ai_response = GeminiEngine.generate_response(db, f"{system_prompt}\nUser Query: {payload.message}")

            # Intercept action tags
            if "[action:apply_leave]" in ai_response.lower() or "[action:take_leave]" in ai_response.lower():
                answer_clean = re.sub(r"\[action:.*\]", "", ai_response, flags=re.IGNORECASE).strip()
                leave_types = list(db.leave_types.find({"entity_id": entity_id, "is_active": True}))
                options = [{"value": lt["_id"], "label": f"{lt['name']} ({lt['code']})"} for lt in leave_types]
                
                return {"success": True, "data": {
                    "answer": answer_clean if answer_clean else "Sure! Please fill out the form below to submit a leave request:",
                    "type": "form",
                    "data": {
                        "form_type": "leave",
                        "fields": [
                            {"name": "leave_type_id", "label": "Leave Type", "type": "dropdown", "options": options},
                            {"name": "start_date", "label": "Start Date", "type": "date"},
                            {"name": "end_date", "label": "End Date", "type": "date"},
                            {"name": "reason", "label": "Reason", "type": "input"},
                        ],
                    },
                }, "error": None}

            elif "[action:raise_ticket]" in ai_response.lower() or "[action:it_ticket]" in ai_response.lower():
                answer_clean = re.sub(r"\[action:.*\]", "", ai_response, flags=re.IGNORECASE).strip()
                return {"success": True, "data": {
                    "answer": answer_clean if answer_clean else "Sure! Please fill in the details below to raise a support ticket:",
                    "type": "form",
                    "data": {
                        "form_type": "ticket",
                        "fields": [
                            {"name": "title", "label": "Issue Title", "type": "input"},
                            {"name": "category", "label": "Category", "type": "dropdown", "options": [
                                {"value": "hardware", "label": "Hardware"},
                                {"value": "software", "label": "Software"},
                                {"value": "network", "label": "Network"},
                                {"value": "access", "label": "Access/Account"},
                            ]},
                            {"name": "priority", "label": "Priority", "type": "dropdown", "options": [
                                {"value": "low", "label": "Low"},
                                {"value": "medium", "label": "Medium"},
                                {"value": "high", "label": "High"},
                                {"value": "critical", "label": "Critical"},
                            ]},
                            {"name": "description", "label": "Detailed Description", "type": "textarea"},
                        ],
                    },
                }, "error": None}

            return {"success": True, "data": {
                "answer": ai_response,
                "type": "text"
            }, "error": None}

        except Exception as exc:
            # Catch LLM errors (e.g. invalid credentials) and print warning
            print(f"[CHAT BOT AI ERROR] Query failed: {exc}. Falling back to hardcoded rules engine.")
            pass

    # =========================================================================
    # KEYWORD-BASED RULES FALLBACK
    # =========================================================================

    # 1. Leave Balance Intent
    if "leave balance" in message or "my leaves" in message or "leave status" in message:
        if not employee:
            return {"success": True, "data": {"answer": "I couldn't find your employee profile in the system. Please check with HR.", "type": "text"}, "error": None}

        balances = list(db.leave_balances.find({"employee_id": employee["_id"]}))
        if not balances:
            return {"success": True, "data": {"answer": "I couldn't find any leave balances for you. Please check with HR.", "type": "text"}, "error": None}

        summary_lines = []
        for b in balances:
            lt = db.leave_types.find_one({"_id": b.get("leave_type_id")})
            name = lt.get("name") if lt else "Leave"
            summary_lines.append(f"- {name}: {b.get('balance', 0)} remaining (of {b.get('entitled', 0)} entitled)")

        summary = "\n".join(summary_lines)
        return {"success": True, "data": {
            "answer": f"You currently have these leave balances:\n{summary}",
            "type": "text",
        }, "error": None}

    # 2. Apply Leave Intent -> ActionForm
    if "apply leave" in message or "take leave" in message or "request leave" in message:
        # Get active leave types
        leave_types = list(db.leave_types.find({"entity_id": current_user["entity_id"], "is_active": True}))
        options = [{"value": lt["_id"], "label": f"{lt['name']} ({lt['code']})"} for lt in leave_types]

        return {"success": True, "data": {
            "answer": "Sure! I can help you apply for leave. Please fill out this short form:",
            "type": "form",
            "data": {
                "form_type": "leave",
                "fields": [
                    {"name": "leave_type_id", "label": "Leave Type", "type": "dropdown", "options": options},
                    {"name": "start_date", "label": "Start Date", "type": "date"},
                    {"name": "end_date", "label": "End Date", "type": "date"},
                    {"name": "reason", "label": "Reason", "type": "input"},
                ],
            },
        }, "error": None}

    # 3. Team Status (Manager/Admin Only)
    if "who is on leave" in message and role in ["MANAGER", "ADMIN", "SUPER_ADMIN", "HR_ADMIN", "HR"]:
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
        leaves = list(db.leave_requests.find({
            "entity_id": current_user["entity_id"],
            "status": "APPROVED",
            "start_date": {"$lte": today},
            "end_date": {"$gte": today},
        }))

        if not leaves:
            return {"success": True, "data": {"answer": "No one is on leave today. The whole team is in!", "type": "text"}, "error": None}

        names = []
        for l in leaves:
            emp = db.employees.find_one({"_id": l.get("employee_id")})
            if emp:
                names.append(emp.get("full_name"))
        names_str = ", ".join(names)
        return {"success": True, "data": {"answer": f"Team members on leave today: {names_str}", "type": "text"}, "error": None}

    # 4. IT Ticket Status
    if "it ticket" in message or "ticket status" in message or "my tickets" in message:
        if not employee:
            return {"success": True, "data": {"answer": "I couldn't find your employee profile to look up tickets.", "type": "text"}, "error": None}

        tickets = list(db.tickets.find({"created_by": user_id}).sort("created_at", -1).limit(3))
        if not tickets:
            return {"success": True, "data": {"answer": "You don't have any recent IT tickets.", "type": "text"}, "error": None}

        rows = []
        for t in tickets:
            created = t["created_at"].strftime("%Y-%m-%d") if hasattr(t["created_at"], "strftime") else str(t["created_at"])
            rows.append({"Title": t.get("title"), "Status": t.get("status"), "Created": created})

        return {"success": True, "data": {
            "answer": "Here are your most recent IT tickets:",
            "type": "table",
            "data": rows,
        }, "error": None}

    # 5. Attendance Summary Intent
    if "attendance" in message or "late" in message:
        if not employee:
            return {"success": True, "data": {"answer": "I couldn't find your employee profile.", "type": "text"}, "error": None}

        records = list(db.attendance.find({"employee_id": employee["_id"]}))
        present = sum(1 for r in records if r.get("status") in ("PRESENT", "LATE", "HALF_DAY"))
        late = sum(1 for r in records if r.get("is_late"))

        return {"success": True, "data": {
            "answer": f"Here is your attendance summary:\n- **Present Days**: {present}\n- **Late Arrivals**: {late}",
            "type": "text",
        }, "error": None}

    # Default fallback
    return {"success": True, "data": {
        "answer": "I'm your HR Assistant. You can ask me about your leave balance, attendance, or raise IT tickets. How can I help you today?",
        "type": "text",
    }, "error": None}


@router.get("/proactive")
def get_proactive_signals(
    current_user: dict = Depends(get_current_user),
):
    try:
        user_id = current_user["user_id"]
        role = current_user.get("role")
        db = get_mongo_db()
        signals = []

        # Resolve Employee profile
        employee = db.employees.find_one({"user_id": user_id})

        # 1. Pending Approvals (Manager/Admin)
        if role in ["MANAGER", "HR_ADMIN", "SUPER_ADMIN", "HR"]:
            pending_count = db.leave_requests.count_documents({
                "entity_id": current_user["entity_id"],
                "status": "PENDING",
            })
            if pending_count > 0:
                signals.append(f"You have {pending_count} pending leave approvals requiring your attention.")

        # 2. Attendance Pattern
        if employee:
            late_count = db.attendance.count_documents({
                "employee_id": employee["_id"],
                "is_late": True,
            })
            if late_count > 2:
                signals.append(f"You've been late {late_count} times recently. Consider checking your schedule.")

        return {"success": True, "data": {"signals": signals}, "error": None}

    except Exception as e:
        return {"success": True, "data": {"signals": []}, "error": str(e)}


# ── Interdepartmental Team Chat Endpoints ─────────────────────
class TeamMessageCreate(BaseModel):
    recipient_id: str
    content: str


@router.get("/employees")
def get_chat_employees(current_user=Depends(get_current_user)):
    db = get_mongo_db()
    entity_id = current_user["entity_id"]
    
    # Resolve current user's employee record
    me = db.employees.find_one({"user_id": current_user["user_id"]})
    my_id = me["_id"] if me else None

    employees = list(db.employees.find({
        "entity_id": entity_id,
        "status": "ACTIVE",
        "_id": {"$ne": my_id}  # exclude self
    }))
    
    result = []
    for emp in employees:
        dept = None
        if emp.get("department_id"):
            dept_doc = db.departments.find_one({"_id": emp["department_id"]})
            dept = dept_doc["name"] if dept_doc else None
            
        result.append({
            "id": emp["_id"],
            "name": emp.get("full_name", ""),
            "email": emp.get("email"),
            "designation": emp.get("designation", "Staff"),
            "department": dept,
            "avatar_url": emp.get("avatar_url")
        })
    return {"success": True, "data": result, "error": None}


@router.get("/messages/{recipient_id}")
def get_chat_messages(recipient_id: str, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    me = db.employees.find_one({"user_id": current_user["user_id"]})
    if not me:
        return {"success": True, "data": [], "error": None}
    
    my_id = me["_id"]
    messages = list(db.team_messages.find({
        "$or": [
            {"sender_id": my_id, "recipient_id": recipient_id},
            {"sender_id": recipient_id, "recipient_id": my_id}
        ]
    }).sort("timestamp", 1))
    
    result = []
    for msg in messages:
        result.append({
            "id": str(msg["_id"]),
            "sender_id": msg["sender_id"],
            "recipient_id": msg["recipient_id"],
            "content": msg["content"],
            "timestamp": msg["timestamp"].isoformat() if hasattr(msg["timestamp"], "isoformat") else str(msg["timestamp"])
        })
    return {"success": True, "data": result, "error": None}


@router.post("/messages")
def send_team_message(payload: TeamMessageCreate, current_user=Depends(get_current_user)):
    db = get_mongo_db()
    me = db.employees.find_one({"user_id": current_user["user_id"]})
    if not me:
        return {"success": False, "error": "Employee profile not found"}
    
    my_id = me["_id"]
    from uuid import uuid4
    msg_id = str(uuid4())
    
    msg_doc = {
        "_id": msg_id,
        "sender_id": my_id,
        "recipient_id": payload.recipient_id,
        "content": payload.content,
        "timestamp": datetime.utcnow()
    }
    db.team_messages.insert_one(msg_doc)
    return {"success": True, "data": {
        "id": msg_id,
        "sender_id": my_id,
        "recipient_id": payload.recipient_id,
        "content": payload.content,
        "timestamp": msg_doc["timestamp"].isoformat()
    }, "error": None}
