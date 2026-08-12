"""Read-only recovery smoke matrix for a running HRMS backend."""

from __future__ import annotations

import json
import os
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


BASE_URL = os.getenv("HRMS_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
ORIGIN = os.getenv("HRMS_SMOKE_ORIGIN", "http://localhost:5173")
TOKEN = os.getenv("HRMS_SMOKE_TOKEN", "")

HTTP_CHECKS = (
    ("startup", "GET", "/"),
    ("notifications", "GET", "/notifications/"),
    ("attendance_today", "GET", "/attendance/today"),
    ("attendance_summary", "GET", "/attendance/today-summary"),
    ("attendance_history", "GET", "/attendance/me"),
    ("payroll", "GET", "/payroll/runs"),
    ("approvals", "GET", "/approvals/requests/my"),
)


def run_check(name: str, method: str, path: str) -> dict:
    headers = {"Origin": ORIGIN, "Accept": "application/json"}
    if TOKEN:
        headers["Authorization"] = f"Bearer {TOKEN}"
    request = Request(f"{BASE_URL}{path}", method=method, headers=headers)
    try:
        with urlopen(request, timeout=10) as response:
            status = response.status
            request_id = response.headers.get("X-Request-ID")
            cors = response.headers.get("Access-Control-Allow-Origin")
    except HTTPError as exc:
        status = exc.code
        request_id = exc.headers.get("X-Request-ID")
        cors = exc.headers.get("Access-Control-Allow-Origin")
    except URLError as exc:
        return {"name": name, "path": path, "status": "offline", "error": str(exc.reason)}

    return {
        "name": name,
        "path": path,
        "status": status,
        "request_id": request_id,
        "cors": cors == ORIGIN,
    }


def main() -> int:
    results = [run_check(*check) for check in HTTP_CHECKS]
    print(json.dumps(results, indent=2))
    return 1 if any(result["status"] == "offline" for result in results) else 0


if __name__ == "__main__":
    sys.exit(main())
