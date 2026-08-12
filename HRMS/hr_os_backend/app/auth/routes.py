import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.auth.context import context_from_user
from app.auth.jwt import create_access_token
from app.auth.password import verify_password
from app.core.mongodb import get_mongo_db
from app.schemas.common import ok


logger = logging.getLogger("hrms.auth")
router = APIRouter(prefix="/auth", tags=["Auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
def login(payload: LoginRequest):
    database = get_mongo_db()
    user = database.users.find_one({"email": payload.email.strip().lower()})
    password_hash = user.get("hashed_password") if user else None
    if not password_hash and user:
        password_hash = user.get("password_hash")

    if not user or not password_hash or not verify_password(payload.password, password_hash):
        logger.info("login_rejected email_present=%s", bool(payload.email))
        raise HTTPException(status_code=401, detail="Invalid email or password")

    context = context_from_user(user)
    token = create_access_token(dict(context))
    database.logs.insert_one(
        {
            "entity_type": "user",
            "entity_id": context["user_id"],
            "action_type": "LOGIN_SUCCESS",
            "status": "SUCCESS",
            "metadata": {"performed_by": context["email"]},
            "timestamp": datetime.now(timezone.utc),
        }
    )
    return ok(
        {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "email": context["email"],
                "role": context["role"],
                "entity_id": context["entity_id"],
            },
        }
    )
