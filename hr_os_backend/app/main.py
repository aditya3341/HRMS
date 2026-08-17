from dotenv import load_dotenv
load_dotenv()

import logging
from uuid import uuid4

from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import HTTPException, RequestValidationError
from fastapi.responses import JSONResponse

from app.core.database import Base
from app.core.mongodb import close_mongo, connect_mongo
from app.core.logging_config import configure_logging
from app.auth.context import validate_auth_configuration
from app.models.entity import Entity
from app.models.user import User
from app.models.notification import Notification
from app.models.leave import Leave  # ensures table creation
from app.models.audit_log import AuditLog  # ensures table creation
from app.models.ai_log import AILog  # ensures table creation
from app.models.payroll_lock import PayrollLock  # ensures table creation
from app.models.config_audit_log import ConfigAuditLog  # ensures table creation
from app.models.performance_history import AppraisalRecord, PromotionRecord, SalaryHistory, PerformanceSnapshot  # ensures table creation

from app.auth.routes import router as auth_router
from app.api.protected import router as protected_router
from app.api.chat import router as chat_router
from app.models.job import Job
from app.api.jobs import router as jobs_router
from app.models.application import Application
from app.api.applications import router as applications_router
from app.api.resume import router as resume_router
from app.models.interview_log import InterviewLog
from app.api.interviews import router as interviews_router
from app.models.offer import Offer
from app.api.offers import router as offers_router
from app.models.employee import Employee
from app.api.onboarding import router as onboarding_router
from app.api.employees import router as employees_router
from app.api.employee_self import router as employee_self_router
from app.api.employee_docs import router as employee_docs_router
from app.api.policies import router as policies_router
from app.models.attendance import Attendance
from app.api.attendance import router as attendance_router
from app.api.biometric_devices import router as biometric_device_router
from app.api.biometric_mapping import router as biometric_mapping_router
from app.models.biometric_mapping import BiometricMapping
from app.models.biometric_log import BiometricLog
from app.api.biometric_logs import router as biometric_logs_router
from app.models.salary_structure import SalaryStructure
from app.models.payroll import PayrollRun, PayrollEntry
from app.api.payroll import router as payroll_router
from app.models.it_asset import ITAsset
from app.api.it_assets import router as it_assets_router
from app.models.it_ticket import ITTicket
from app.api.it_tickets import router as it_tickets_router
from app.models.permission import Permission
from app.models.role_permission import RolePermission
from app.api.notifications import router as notifications_router
from app.api.leave import router as leave_router, alias_router as leave_alias_router
from app.api.dashboard import router as dashboard_router
from app.api.approvals import router as approvals_router
from app.api.org_chart import router as org_chart_router
from app.models.ticket import Ticket, TicketComment
from app.models.automation_rule import AutomationRule
from app.api.tickets import router as tickets_router
from app.api.automation import router as automation_router
from app.api.audit import router as audit_router
from app.api.admin import router as admin_router
from app.api.leave_analytics import router as leave_analytics_router
from app.api.system_config import router as config_router
from app.api.performance import router as performance_router
from app.api.appraisal import router as appraisal_router
from app.api.analytics import router as analytics_router
from app.api.ai_logs import router as ai_logs_router
from app.api.teambridge import router as teambridge_router

configure_logging()
logger = logging.getLogger("hrms.api")
app = FastAPI(title="HR OS MVP")



import os

def get_allowed_origins() -> list[str]:
    defaults = [
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:5174", "http://127.0.0.1:5174",
        "http://localhost:5175", "http://127.0.0.1:5175",
        "http://localhost:3000", "http://127.0.0.1:3000",
    ]
    env_origins = os.getenv("CORS_ORIGINS", "")
    if env_origins:
        defaults.extend([o.strip() for o in env_origins.split(",") if o.strip()])
    return defaults

def is_allowed_origin(origin: str) -> bool:
    if not origin:
        return False
    allowed = get_allowed_origins()
    if origin in allowed:
        return True
    if origin.endswith(".vercel.app") or origin.endswith(".render.com"):
        return True
    return False

# 2. STANDARDIZE API RESPONSE MIDDLEWARE
@app.middleware("http")
async def standardize_response_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid4())
    try:
        response = await call_next(request)
    except Exception as exc:
        logger.exception(
            "request_failed request_id=%s method=%s path=%s error_type=%s",
            request_id,
            request.method,
            request.url.path,
            type(exc).__name__,
        )
        origin = request.headers.get("origin")
        headers = {"X-Request-ID": request_id}
        if origin and is_allowed_origin(origin):
            headers = {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Credentials": "true",
                "Vary": "Origin",
            }
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "data": None,
                "error": "An unexpected internal error occurred.",
            },
            headers=headers,
        )

    response.headers["X-Request-ID"] = request_id

    # Only process JSON responses
    if response.headers.get("content-type") == "application/json":
        import json
        from fastapi.responses import Response

        body = b""
        async for chunk in response.body_iterator:
            body += chunk

        try:
            data = json.loads(body)
            # If already wrapped, don't double wrap
            if not (isinstance(data, dict) and "success" in data and "data" in data):
                new_content = {
                    "success": response.status_code < 400,
                    "data": data if response.status_code < 400 else None,
                    "error": data.get("detail") if response.status_code >= 400 and isinstance(data, dict) else (data if response.status_code >= 400 else None)
                }
                if response.status_code >= 400:
                    new_content["data"] = None
                else:
                    new_content["error"] = None

                body = json.dumps(new_content).encode("utf-8")

            safe_headers = {
                k: v for k, v in response.headers.items()
                if k.lower() not in ("content-length", "transfer-encoding")
            }

            origin = request.headers.get("origin")
            if origin and is_allowed_origin(origin):
                safe_headers["Access-Control-Allow-Origin"] = origin
                safe_headers["Access-Control-Allow-Credentials"] = "true"
                safe_headers["Vary"] = "Origin"

            return Response(
                content=body,
                status_code=response.status_code,
                headers=safe_headers,
                media_type="application/json",
            )
        except Exception as e:
            print(f"Middleware Error: {e}")
            return Response(
                content=body,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type="application/json",
            )

    return response

# =============================================================
# GLOBAL EXCEPTION HANDLERS
# =============================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    print(f"DEBUG: HTTPException caught: {exc.status_code} - {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "data": None, "error": exc.detail},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = "; ".join(
        f"{' -> '.join(str(loc) for loc in e['loc'])}: {e['msg']}"
        for e in exc.errors()
    )
    return JSONResponse(
        status_code=422,
        content={"success": False, "data": None, "error": f"Validation error: {errors}"},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    print(f"[UNHANDLED ERROR] {request.method} {request.url}: {exc}")
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"success": False, "data": None, "error": "An unexpected internal error occurred."},
    )


def verify_schema():
    """SQL schemas are not used; MongoDB indexes are managed separately."""
    return None

# =============================================================
# MIDDLEWARE (OUTERMOST LAST)
# =============================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_origin_regex=r"https://.*\.vercel\.app|https://.*\.render\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    print("[HR OS] Backend Starting...")
    validate_auth_configuration()
    connect_mongo()
    print("[HR OS] MongoDB is the only active database.")
    
    print("[HR OS] REGISTERED ROUTES:")
    for route in app.routes:
        print(f"  {getattr(route, 'methods', '')} {getattr(route, 'path', '')}")


@app.on_event("shutdown")
def on_shutdown():
    close_mongo()


# =============================================================
# REGISTER ROUTERS
# =============================================================
app.include_router(auth_router)
app.include_router(protected_router)
app.include_router(notifications_router)
app.include_router(jobs_router)
app.include_router(applications_router)
app.include_router(resume_router)
app.include_router(interviews_router)
app.include_router(offers_router)
app.include_router(onboarding_router)
app.include_router(employees_router)
app.include_router(employee_self_router)
app.include_router(employee_docs_router)
app.include_router(policies_router)
app.include_router(attendance_router)
app.include_router(biometric_device_router)
app.include_router(biometric_mapping_router)
from app.api.biometric_upload import router as biometric_upload_router
app.include_router(biometric_upload_router)
app.include_router(biometric_logs_router)
app.include_router(payroll_router)
app.include_router(it_assets_router)
app.include_router(it_tickets_router)
app.include_router(leave_router)
app.include_router(leave_alias_router)
app.include_router(dashboard_router)
app.include_router(approvals_router)
app.include_router(org_chart_router)
app.include_router(tickets_router)
app.include_router(automation_router)
app.include_router(audit_router)
app.include_router(admin_router)
app.include_router(config_router)
app.include_router(performance_router, prefix="/performance")
app.include_router(appraisal_router, prefix="/performance")
app.include_router(analytics_router)
app.include_router(leave_analytics_router)
app.include_router(ai_logs_router)
app.include_router(chat_router)
app.include_router(teambridge_router)

# ─── BioMax Integration Alias Routes ───────────────────────────
from app.api.attendance import receive_external_punch, trigger_biometric_sync, trigger_employees_sync, trigger_leave_update, ExternalPunchRequest

@app.post("/api/attendance/punch")
def api_attendance_punch(request: ExternalPunchRequest):
    return receive_external_punch(request)

@app.post("/employees/sync")
def api_employees_sync():
    return trigger_employees_sync()

@app.post("/leave/update")
def api_leave_update():
    return trigger_leave_update()
# ─────────────────────────────────────────────────────────────

from app.auth.deps import get_current_user
from app.core.mongodb import get_mongo_db

@app.get("/action-center")
def get_root_action_center(current_user: dict = Depends(get_current_user)):
    db = get_mongo_db()
    
    unresolved_flags = list(db.fraud_flags.find({"is_resolved": False}))
    items = []
    for flag in unresolved_flags:
        items.append({
            "id": flag["_id"],
            "employee_id": flag.get("employee_id"),
            "severity": flag.get("severity"),
            "is_resolved": flag.get("is_resolved"),
            "type": "FRAUD_FLAG",
            "title": f"Potential Fraud: {flag.get('severity')} severity",
            "description": f"Employee {flag.get('employee_id')} triggered a fraud flag.",
        })
        
    action_items = list(db.action_items.find({}))
    for item in action_items:
        item["id"] = str(item.pop("_id", item.get("id")))
        items.append(item)
        
    return {"success": True, "data": items, "error": None}

@app.get("/")
def root():
    return {"success": True, "data": {"message": "HR OS is running"}, "error": None}

#if __name__ == "__main__":
 #   import uvicorn
#    uvicorn.run("main:app", host="0.0.0.0", port=8004, reload=False)
#
