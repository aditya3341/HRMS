# HR OS Backend

FastAPI backend for the HRMS application.

## Local setup

```powershell
cd hr_os_backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

## MongoDB configuration

MongoDB is selected with `MONGO_PROFILE`. The safe default is `local`, using
`mongodb://127.0.0.1:27017` and the `hr_onboarding` database.

Copy `.env.example` to `.env`, then use one of these profiles:

```powershell
# Local development ("spiderman" in MongoDB Compass)
$env:MONGO_PROFILE = "local"

# Company integration server (URI must be supplied securely)
$env:MONGO_PROFILE = "remote"
$env:MONGO_REMOTE_URI = "mongodb://..."
```

The application creates one process-wide `MongoClient`. PyMongo pools and
reuses its sockets, validates the connection at startup, and closes the pool
on application shutdown. Remote credentials belong only in `.env` or the
deployment secret store and must not be committed.

`DEFAULT_ENTITY_ID` is required because company `users` documents do not carry
tenant information. The current single-tenant default is `Zipaworld`.

## Recovery smoke matrix

With the backend running locally:

```powershell
.\.venv\Scripts\python.exe scripts\smoke_backend.py
```

For token authentication, set `HRMS_SMOKE_TOKEN` before running the command.
The script is read-only and checks startup, notifications, attendance, payroll,
and approvals. Every HTTP response includes `X-Request-ID`; use that value to
match a browser failure to the corresponding backend log entry.

Current recovery status:

- Mongo connection lifecycle and company ObjectId authentication: recovered
- Notifications using the company collection schema: recovered
- Attendance self-service reads and manual check-in/out: recovered
- Attendance live WebSocket authentication: recovered
- Payroll run/payslip reads: recovered
- Payroll processing writes and advanced attendance workflows: pending
- Approvals and remaining feature repositories: pending

> Migration note: some business routes still use the temporary Mongo-backed
> SQLAlchemy model compatibility layer. No SQL connection is opened; each
> feature is being moved to a native Mongo repository before that layer and
> the SQL dependencies are removed.

Default seeded admin account:

- Email: `admin@aaa2.com`
- Password: `admin123`

If you start from an empty database, run:

```powershell
python -m app.seed_data
python -m app.seed_permissions
```

## Development Auth Bypass

Authentication is bypassed by default for local development. Protected routes
act as the seeded `admin@aaa2.com` user without requiring a bearer token.

Re-enable normal token authentication before non-development use:

```powershell
$env:DEV_AUTH_BYPASS = "false"
```
