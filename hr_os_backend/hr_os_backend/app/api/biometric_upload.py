"""Biometric Upload API — native MongoDB."""

import csv
import io
from datetime import datetime
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from app.core.mongodb import get_mongo_db
from app.auth.constants import Permissions
from app.auth.permission import require_permission

router = APIRouter(prefix="/biometric/upload", tags=["Biometric Upload"])


@router.post(
    "/csv",
    dependencies=[Depends(require_permission(Permissions.BIOMETRIC_MANAGE))],
)
async def upload_biometric_csv(
    file: UploadFile = File(...),
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    contents = await file.read()
    decoded = contents.decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded))

    db = get_mongo_db()
    logs_created = 0
    errors = []

    for row in reader:
        try:
            employee_code = row.get('employee_code') or row.get('biometric_id')
            timestamp_str = row.get('timestamp')
            punch_type = row.get('punch_type')

            if not employee_code or not timestamp_str:
                errors.append(f"Missing data in row: {row}")
                continue

            try:
                timestamp = datetime.fromisoformat(timestamp_str)
            except ValueError:
                timestamp = datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S")

            lid = str(uuid4())
            db.biometric_logs.insert_one({
                "_id": lid,
                "id": lid,
                "employee_code": employee_code,
                "biometric_id": employee_code,
                "timestamp": timestamp,
                "punch_type": punch_type,
                "processed": False,
                "raw_payload": {"source": "CSV_UPLOAD", "filename": file.filename},
            })
            logs_created += 1

        except Exception as e:
            errors.append(f"Error processing row {row}: {str(e)}")

    return {
        "success": True,
        "data": {
            "logs_staged": logs_created,
            "errors": errors if errors else None,
        },
        "error": None,
    }
