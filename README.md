# HR OS — Enterprise Human Resource Operating System

> A full-stack, modular HR management platform built for **Zipaworld** — featuring intelligent payroll, biometric attendance, performance management, AI-powered tools, and real-time dashboards.

---

## Table of Contents

- [Quick Start](#quick-start)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Database Layer](#database-layer)
- [Authentication & Authorization](#authentication--authorization)
- [Backend Modules](#backend-modules)
- [Frontend Modules](#frontend-modules)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Project Statistics](#project-statistics)
- [Recommended Upgrades](#recommended-upgrades)

---

## Quick Start

### Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.11+ |
| Node.js | 18+ |
| npm | 9+ |

### Run Backend

```powershell
cd hr_os_backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend runs at `http://127.0.0.1:8000`. API docs at `http://127.0.0.1:8000/docs`.

### Run Frontend

```powershell
cd hr_os_frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

### Development Authentication Bypass

Local development skips the login screen and auto-authenticates as the seeded `admin@aaa2.com` super-admin account.

To turn authentication back on:

```powershell
$env:DEV_AUTH_BYPASS = "false"
$env:VITE_DEV_AUTH_BYPASS = "false"
```

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                       BROWSER (Client)                       │
│  React 18 + TypeScript + Tailwind CSS + shadcn/ui + Vite    │
│                                                              │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐  │
│  │ Zustand  │ │ React    │ │ Axios    │ │ React Query    │  │
│  │ Store    │ │ Router   │ │ Client   │ │ (Server State) │  │
│  └─────────┘ └──────────┘ └──────────┘ └────────────────┘  │
└─────────────────────────┬────────────────────────────────────┘
                          │ HTTP / WebSocket
                          ▼
┌──────────────────────────────────────────────────────────────┐
│                    BACKEND API SERVER                         │
│          FastAPI + Uvicorn (Python 3.11+)                    │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Auth Layer  │  │ CORS         │  │ Response         │   │
│  │ JWT + RBAC  │  │ Middleware   │  │ Standardizer     │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  36 API Routers                       │   │
│  │  Auth · Employees · Leave · Attendance · Payroll     │   │
│  │  Performance · Biometric · Tickets · Approvals · ... │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              19 Service Layer Classes                  │   │
│  │  PayrollService · LeaveService · ApprovalService     │   │
│  │  AttendanceService · AI Service · FraudDetection     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────┬────────────────────────────────────┘
                          │ SQLAlchemy ORM
                          ▼
┌──────────────────────────────────────────────────────────────┐
│                        DATABASE                              │
│                                                              │
│   Development: SQLite  (hr_os.db — file-based, zero config) │
│   Production:  PostgreSQL (via DB_URL env variable)          │
│                                                              │
│   35 Models · Alembic migrations · Connection pooling        │
└──────────────────────────────────────────────────────────────┘
```

### Request Flow

1. **Browser** sends HTTP request with JWT Bearer token in `Authorization` header
2. **CORS Middleware** validates the origin (`localhost:5173`)
3. **Auth Dependency** (`get_current_user`) decodes JWT, verifies user exists in DB
4. **Router Handler** processes business logic, calls service layer
5. **Response Standardizer Middleware** wraps all JSON responses into `{ success, data, error }` envelope
6. **Browser** receives response → Axios interceptor unwraps `data` field automatically

---

## Tech Stack

### Backend

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Framework | **FastAPI** 0.115+ | Async REST API with auto-generated OpenAPI docs |
| Server | **Uvicorn** | ASGI server with hot-reload support |
| ORM | **SQLAlchemy 2.0** | Database models with type-safe mapped columns |
| Migrations | **Alembic** | Version-controlled schema migrations |
| Auth | **python-jose** (JWT) + **passlib** (bcrypt) | Token-based authentication |
| AI | **Google Generative AI** | Resume analysis, chatbot, AI-powered insights |
| PDF/Docs | **pdfplumber** + **python-docx** + **ReportLab** | Resume parsing, offer letter generation |
| Validation | **Pydantic 2.7+** | Request/response schema validation |

### Frontend

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Framework | **React 18** + **TypeScript** | Component-based UI with strict typing |
| Build Tool | **Vite 5** | Fast dev server with HMR |
| Styling | **Tailwind CSS 3** + **shadcn/ui** (Radix primitives) | Utility-first CSS + accessible components |
| Routing | **React Router v6** | Client-side routing with nested layouts |
| Server State | **TanStack React Query** | API data caching, background refetch |
| Client State | **Zustand** (persisted) | User session store in localStorage |
| HTTP Client | **Axios** | Request/response interceptors, JWT injection |
| Charts | **Recharts** | Data visualization for dashboards |
| Animations | **Framer Motion** | Page transitions, sidebar animations |
| Forms | **React Hook Form** + **Zod** | Form validation with schema-first approach |
| PDF Export | **jsPDF** + **jspdf-autotable** | Client-side PDF generation |

---

## Database Layer

### Connection Configuration

```
File: hr_os_backend/app/core/database.py
```

| Setting | Dev (SQLite) | Production (PostgreSQL) |
|---------|-------------|------------------------|
| Engine | `sqlite:///./hr_os.db` | Set via `DB_URL` env var |
| Thread Safety | `check_same_thread=False` | N/A |
| Pool Size | N/A (SQLite) | 10 persistent + 20 overflow |
| Pool Recycle | N/A | Every 30 minutes |
| Pool Pre-Ping | ✅ | ✅ |
| SQL Logging | `DB_ECHO=true` to enable | Off by default |

### Database Tables (35 models)

```
File: hr_os_backend/app/models/
```

| Category | Tables | Key Fields |
|----------|--------|------------|
| **Identity** | `entities`, `users`, `employees`, `departments` | UUID PKs, entity scoping, manager hierarchy |
| **Hiring** | `jobs`, `applications`, `interview_logs`, `offers` | Multi-stage application pipeline (APPLIED → JOINED) |
| **Onboarding** | Stored in `employees` table | `status` = ONBOARDING/ACTIVE/EXIT_PROCESS/EXITED |
| **Attendance** | `attendance`, `biometric_devices`, `biometric_mappings`, `biometric_logs` | Check-in/out, LATE/HALF_DAY/ABSENT logic |
| **Leave** | `leave_types`, `leave_balances`, `leave_requests`, `holidays` | Accrual, carry-forward, LOP |
| **Payroll** | `salary_structures`, `payroll_runs`, `payroll_entries`, `payroll_locks` | Pro-rated salary, LOP deduction, HR overrides |
| **Performance** | `performance_cycles`, `kpas`, `kras`, `goals`, `reviews`, `review_steps` | Multi-reviewer workflow (Self → Manager → HR) |
| **Performance History** | `appraisal_records`, `promotion_records`, `salary_history`, `performance_snapshots` | Historical tracking across cycles |
| **IT & Support** | `it_assets`, `it_tickets`, `tickets`, `ticket_comments` | Asset lifecycle, SLA tracking |
| **Approvals** | `approval_queues`, `approval_steps` | Multi-level approval workflows |
| **System** | `permissions`, `role_permissions`, `role_metadata`, `system_configs`, `automation_rules` | RBAC, dynamic configs |
| **Audit** | `audit_logs`, `config_audit_logs`, `ai_logs`, `notifications` | Full audit trail for all operations |

### Schema Validation

On every startup, the backend runs **strict schema validation** that compares all SQLAlchemy model columns against actual database columns. If any table or column is missing, the server **refuses to start** and prints the exact mismatches.

### Migrations

```powershell
cd hr_os_backend
alembic revision --autogenerate -m "description"
alembic upgrade head
```

---

## Authentication & Authorization

### Auth Flow

```
┌─────────┐    POST /auth/login     ┌─────────┐
│ Browser │ ──────────────────────→ │ Backend │
│         │ ←────────────────────── │         │
│         │    { access_token }     │         │
│         │                         │         │
│         │    GET /protected/me    │         │
│         │    Authorization:       │         │
│         │    Bearer <token>       │         │
│         │ ──────────────────────→ │         │
│         │ ←────────────────────── │         │
│         │    { user, role,        │         │
│         │      permissions }      │         │
└─────────┘                         └─────────┘
```

### JWT Configuration

| Setting | Value |
|---------|-------|
| Algorithm | HS256 |
| Token Expiry | 24 hours |
| Secret Key | `CHANGE_THIS_SECRET` (⚠️ must be changed for production!) |
| Storage | `localStorage["token"]` |

### Role-Based Access Control (RBAC)

| Role | Access Level |
|------|-------------|
| `SUPER_ADMIN` | Full system access, system config, command center |
| `HR_ADMIN` / `ADMIN` | Employee management, payroll, hiring, analytics |
| `HR` | Same as HR_ADMIN (legacy alias) |
| `MANAGER` | Team dashboard, leave approvals, performance reviews |
| `EMPLOYEE` | Self-service: dashboard, leave, attendance, profile |

Frontend enforces roles via `<RoleRoute allowedRoles={[...]}/>` wrapper and `hasRole()` checks in the Sidebar.

---

## Backend Modules

### API Routers (36 total)

| Module | Router File | Key Endpoints |
|--------|------------|---------------|
| **Auth** | `auth/routes.py` | `POST /auth/login` |
| **User Profile** | `api/protected.py` | `GET /protected/me` |
| **Employees** | `api/employees.py` | CRUD, search, status transitions |
| **Employee Self-Service** | `api/employee_self.py` | Profile view/edit by logged-in user |
| **Employee Documents** | `api/employee_docs.py` | Upload/download documents |
| **Jobs** | `api/jobs.py` | Job postings CRUD |
| **Applications** | `api/applications.py` | Application pipeline management |
| **Interviews** | `api/interviews.py` | Interview scheduling, feedback |
| **Offers** | `api/offers.py` | Offer creation, approval, acceptance |
| **Onboarding** | `api/onboarding.py` | Multi-step onboarding workflow |
| **Attendance** | `api/attendance.py` | Check-in/out, history, team view |
| **Biometric** | `api/biometric_*.py` | Device management, log upload, mapping |
| **Leave** | `api/leave.py` | Apply, approve/reject, balance, calendar |
| **Leave Analytics** | `api/leave_analytics.py` | Department-wise leave statistics |
| **Payroll** | `api/payroll.py` | Run payroll, payslips, override amounts |
| **Performance** | `api/performance.py` | Cycles, KPAs, goals, reviews |
| **Appraisal** | `api/appraisal.py` | Appraisal records, promotions |
| **Approvals** | `api/approvals.py` | Generic multi-level approval inbox |
| **Dashboard** | `api/dashboard.py` | Aggregated stats for all roles |
| **Analytics** | `api/analytics.py` | Cross-module analytics data |
| **IT Assets** | `api/it_assets.py` | Asset lifecycle management |
| **IT Tickets** | `api/it_tickets.py` | Help desk tickets |
| **Tickets (ZipaDesk)** | `api/tickets.py` | Full ticketing system with SLA |
| **Notifications** | `api/notifications.py` | In-app notifications |
| **Org Chart** | `api/org_chart.py` | Hierarchical org visualization data |
| **Chat / AI** | `api/chat.py` | AI chatbot (Google Generative AI) |
| **Resume Analyzer** | `api/resume.py` | AI-powered resume parsing |
| **Policies** | `api/policies.py` | Company policy management |
| **System Config** | `api/system_config.py` | Dynamic system settings |
| **Admin** | `api/admin.py` | User/role/department management |
| **Audit** | `api/audit.py` | Audit log viewer |
| **Automation** | `api/automation.py` | Workflow automation rules |
| **AI Logs** | `api/ai_logs.py` | AI usage tracking |

### Service Layer (19 services)

| Service | Responsibility |
|---------|---------------|
| `approval_service.py` (42 KB) | Multi-level approval queue engine |
| `attendance_service.py` (20 KB) | Check-in/out processing, late detection |
| `leave_service.py` (16 KB) | Leave balance, accrual, LOP calculation |
| `payroll_service.py` (15 KB) | Intelligent salary calculation, deductions |
| `review_service.py` (10 KB) | Multi-step performance review workflow |
| `appraisal_service.py` (8 KB) | Appraisal generation, finalization |
| `goal_service.py` (6 KB) | Employee goal management |
| `fraud_detection_service.py` (5 KB) | Attendance anomaly detection |
| `attendance_behavior_service.py` (5 KB) | Attendance pattern analysis |
| `promotion_service.py` (4 KB) | Promotion proposals and approvals |
| `biometric_service.py` (4 KB) | Biometric device data processing |
| `trust_score_service.py` (4 KB) | Employee trust scoring |
| `attendance_processor_service.py` (4 KB) | Batch attendance processing |
| `analytics_service.py` (4 KB) | Cross-module analytics calculations |
| `ai_service.py` (3 KB) | Google Generative AI integration |
| `performance_service.py` (3 KB) | Performance cycle management |

---

## Frontend Modules

### Pages (40+ routes)

| Module | Pages | Route Prefix |
|--------|-------|-------------|
| **Dashboard** | Employee Dashboard, Manager Dashboard, HR Intelligence, Employee Insights | `/dashboard/*` |
| **Hiring** | Jobs, Applications, Offers, Offer Approval | `/jobs`, `/applications`, `/offers` |
| **Onboarding** | Onboarding List, Onboarding Detail | `/onboarding/*` |
| **Attendance** | Dashboard, History, Team View, Live Monitoring | `/attendance/*` |
| **Leave** | Dashboard, Apply, Calendar, Manage Requests, Analytics | `/leaves/*` |
| **Payroll** | Dashboard (admin), Payslip View | `/payroll/*` |
| **Performance** | My Goals, Team Reviews, Review Cycles, KPA Management, Appraisal Center, Analytics | `/performance/*` |
| **IT & Support** | IT Assets, ZipaDesk (Ticketing) | `/it-assets`, `/zipadesk` |
| **TeamBridge** | Interdepartmental messaging & approval hub | `/team` |
| **Approvals** | Inbox, Analytics | `/approvals`, `/analytics` |
| **Admin** | Biometric Config, System Config, AI Settings, System Settings, Command Center | `/admin/*` |
| **Utility** | Dashboard, Resume Analyzer, Proctor Tool | `/utility-tools/*` |
| **Org** | Org Chart | `/org-chart` |

### Key Components

| Component | Purpose |
|-----------|---------|
| `AppLayout.tsx` | Main layout shell (Sidebar + Header + Content + Chatbot) |
| `Sidebar.tsx` | Role-aware navigation with expandable menus |
| `ProtectedRoute.tsx` | Auth guard wrapper |
| `RoleRoute.tsx` | RBAC route wrapper |
| `NotificationBell.tsx` | Real-time notification indicator |
| `Chatbot/` | AI chatbot floating panel |
| `TeamBridge.tsx` | Full messaging + approval workflow page |

---

## Environment Variables

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_URL` | `sqlite:///./hr_os.db` | Database connection string |
| `DB_ECHO` | `false` | Enable SQL query logging |
| `DEV_AUTH_BYPASS` | `true` | Skip authentication in development |
| `DEV_ADMIN_EMAIL` | `admin@aaa2.com` | Auto-login user for dev bypass |
| `GOOGLE_API_KEY` | — | Google Generative AI API key (for chatbot/resume) |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_DEV_AUTH_BYPASS` | `true` (if not set) | Skip login screen in development |

---

## Project Statistics

| Metric | Value |
|--------|-------|
| Backend Python files | 142 files (590 KB) |
| Frontend TS/TSX/CSS files | 239 files (1,248 KB) |
| Database models | 35 tables |
| API routers | 36 modules |
| Service classes | 19 services |
| Frontend routes | 40+ pages |
| Custom hooks | 14 hooks |
| Total enums | 22 status/type enums |

---

## Recommended Upgrades

### 🔴 Critical — Security & Stability

| # | Upgrade | Current State | Recommendation |
|---|---------|--------------|----------------|
| 1 | **JWT Secret Key** | Hardcoded `CHANGE_THIS_SECRET` in `auth/jwt.py` | Move to environment variable. Use a strong random key (256-bit). |
| 2 | **CORS Origins** | Hardcoded `localhost:5173` only | Add production domain. Use env variable for allowed origins. |
| 3 | **Password Hashing** | bcrypt via passlib (good) but `bcrypt<4.1` pinned | Update bcrypt constraint; passlib is deprecated — consider migrating to `argon2-cffi`. |
| 4 | **Rate Limiting** | None on `/auth/login` | Add `slowapi` or similar to prevent brute-force attacks. |
| 5 | **HTTPS** | Not enforced | Enforce HTTPS in production. Add HSTS headers. |
| 6 | **Token Refresh** | No refresh token — 24-hour expiry only | Implement refresh token rotation for better security. |

### 🟡 Important — Architecture & Performance

| # | Upgrade | Current State | Recommendation |
|---|---------|--------------|----------------|
| 7 | **Database → PostgreSQL** | SQLite in dev (single-file, no concurrent writes) | Migrate to PostgreSQL for production. SQLite is fine for development. |
| 8 | **Background Jobs** | Reminder engine runs in-browser (TeamBridge) | Add **Celery + Redis** for server-side background tasks (payroll processing, email notifications, scheduled reports). |
| 9 | **Email Notifications** | None — in-app notifications only | Add email service (SendGrid/SES) for leave approvals, offer letters, payroll summaries. |
| 10 | **File Storage** | Local filesystem (`employee_docs/`, `resumes/`, `offer_letters/`) | Migrate to **S3/MinIO** for scalable blob storage. |
| 11 | **WebSocket Auth** | Basic token-in-query approach | Use proper WebSocket authentication middleware. |
| 12 | **API Pagination** | Inconsistent across endpoints | Standardize cursor-based or offset pagination for all list endpoints. |
| 13 | **Caching** | No caching layer | Add **Redis** for caching dashboard aggregations, leave balances, org chart data. |

### 🟢 Feature Enhancements

| # | Upgrade | Description |
|---|---------|-------------|
| 14 | **TeamBridge Backend** | Currently uses mock data. Build a real messaging API with WebSocket for real-time chat, persistent message storage, and file sharing. |
| 15 | **Employee Self-Service Portal** | Add salary slip download, tax declaration (Form 16), investment declarations, expense reimbursement. |
| 16 | **Mobile Responsive** | Dashboard pages assume desktop. Add responsive breakpoints for tablet/mobile. |
| 17 | **Dark Mode** | shadcn/ui supports theming — add a dark/light mode toggle. |
| 18 | **Bulk Operations** | Bulk import employees via CSV/Excel. Bulk leave approval. Bulk payroll adjustments. |
| 19 | **Reporting Module** | Scheduled PDF/Excel report generation (monthly headcount, attrition, leave trends). |
| 20 | **Multi-Tenant** | Entity model exists but is single-tenant. Extend for full multi-org support. |
| 21 | **SSO/LDAP** | Add Single Sign-On via SAML/OAuth2 or Active Directory integration. |
| 22 | **Audit Dashboard** | Audit logs exist but no UI to search/filter/export them. Build an admin audit viewer. |
| 23 | **Attendance Geo-Fencing** | Add GPS-based check-in validation for field employees. |
| 24 | **Leave Encashment** | Calculate and process leave encashment during exit or annually. |

### 🔧 Code Quality

| # | Upgrade | Description |
|---|---------|-------------|
| 25 | **Test Coverage** | Limited tests. Add pytest fixtures for all API endpoints. Target 80% coverage. |
| 26 | **API Versioning** | No versioning (`/auth/login` not `/v1/auth/login`). Add version prefix for backward compatibility. |
| 27 | **Error Codes** | Errors return strings. Add structured error codes (`AUTH_001`, `LEAVE_002`) for frontend i18n. |
| 28 | **Docker** | No containerization. Add `Dockerfile` + `docker-compose.yml` for one-command setup. |
| 29 | **CI/CD** | No pipeline. Add GitHub Actions for lint, test, build, deploy. |
| 30 | **Logging** | Uses `print()` statements. Migrate to structured logging with `loguru` or `structlog`. |
