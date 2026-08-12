import logging
import os

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.auth.context import UserContext, context_from_user, find_user_by_id
from app.auth.jwt import ALGORITHM, SECRET_KEY
from app.core.mongodb import get_mongo_db


logger = logging.getLogger("hrms.auth")
def is_dev_auth_bypass() -> bool:
    return os.getenv("DEV_AUTH_BYPASS", "false").lower() == "true"

DEV_ADMIN_EMAIL = os.getenv("DEV_ADMIN_EMAIL", "admin@zipaworld.com")
security = HTTPBearer(auto_error=False)


def get_dev_admin_payload() -> UserContext:
    user = get_mongo_db().users.find_one({"email": DEV_ADMIN_EMAIL})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Development auth bypass user not found: {DEV_ADMIN_EMAIL}",
        )
    return context_from_user(user)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> UserContext:
    if is_dev_auth_bypass():
        return get_dev_admin_payload()
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication payload",
            )
        return context_from_user(find_user_by_id(user_id), payload)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


async def get_current_user_from_token(token: str, db=None) -> UserContext:
    if is_dev_auth_bypass():
        return get_dev_admin_payload()
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication payload",
            )
        return context_from_user(find_user_by_id(user_id), payload)
    except JWTError:
        logger.info("websocket_auth_rejected reason=invalid_token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
