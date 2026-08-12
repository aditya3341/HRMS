"""MongoDB connection lifecycle and environment selection.

One MongoClient is shared by the whole process. PyMongo manages its internal
connection pool; creating a client per request would leak sockets and create
unnecessary load on MongoDB.
"""

import os
from threading import RLock
from typing import Optional
from urllib.parse import urlsplit

from pymongo import MongoClient
from pymongo.database import Database
from pymongo.errors import PyMongoError


LOCAL_PROFILE = "local"
REMOTE_PROFILE = "remote"
VALID_PROFILES = {LOCAL_PROFILE, REMOTE_PROFILE}

_client: Optional[MongoClient] = None
_database: Optional[Database] = None
_lock = RLock()


def _profile() -> str:
    profile = os.getenv("MONGO_PROFILE", LOCAL_PROFILE).strip().lower()
    if profile not in VALID_PROFILES:
        choices = ", ".join(sorted(VALID_PROFILES))
        raise RuntimeError(f"Invalid MONGO_PROFILE '{profile}'. Use one of: {choices}.")
    return profile


def _settings() -> tuple[str, str, str]:
    profile = _profile()
    if profile == REMOTE_PROFILE:
        uri = os.getenv("MONGO_REMOTE_URI", "").strip()
        if not uri:
            raise RuntimeError(
                "MONGO_PROFILE is 'remote', but MONGO_REMOTE_URI is not configured."
            )
        database_name = os.getenv(
            "MONGO_REMOTE_DB", os.getenv("MONGO_DB", "hr_onboarding")
        ).strip()
    else:
        uri = os.getenv(
            "MONGO_LOCAL_URI",
            "mongodb://127.0.0.1:27017",
        ).strip()
        database_name = os.getenv(
            "MONGO_LOCAL_DB", "hr_onboarding"
        ).strip()

    if not database_name:
        raise RuntimeError("MongoDB database name cannot be empty.")
    return profile, uri, database_name


def _safe_target(uri: str) -> str:
    """Return host information without ever logging credentials."""
    try:
        parsed = urlsplit(uri.replace("mongodb+srv://", "mongodb://", 1))
        return parsed.hostname or "configured server"
    except ValueError:
        return "configured server"


def connect_mongo() -> Database:
    """Connect once, validate the server, and return the selected database."""
    global _client, _database
    with _lock:
        if _database is not None:
            return _database

        profile, uri, database_name = _settings()
        client = MongoClient(
            uri,
            appname="hrms-backend",
            serverSelectionTimeoutMS=int(os.getenv("MONGO_CONNECT_TIMEOUT_MS", "5000")),
            connectTimeoutMS=int(os.getenv("MONGO_CONNECT_TIMEOUT_MS", "5000")),
            socketTimeoutMS=int(os.getenv("MONGO_SOCKET_TIMEOUT_MS", "20000")),
            maxPoolSize=int(os.getenv("MONGO_MAX_POOL_SIZE", "20")),
            minPoolSize=int(os.getenv("MONGO_MIN_POOL_SIZE", "0")),
            maxIdleTimeMS=int(os.getenv("MONGO_MAX_IDLE_TIME_MS", "60000")),
            retryReads=True,
            retryWrites=True,
        )
        try:
            client.admin.command("ping")
        except PyMongoError as exc:
            client.close()
            raise RuntimeError(
                f"Could not connect to the {profile} MongoDB server "
                f"({_safe_target(uri)}): {exc}"
            ) from exc

        _client = client
        _database = client[database_name]
        print(
            f"[MongoDB] Connected: profile={profile}, "
            f"host={_safe_target(uri)}, database={database_name}"
        )
        return _database


def get_mongo_db() -> Database:
    """FastAPI dependency/accessor backed by the process-wide connection pool."""
    return connect_mongo()


def close_mongo() -> None:
    """Close all pooled sockets during application shutdown."""
    global _client, _database
    with _lock:
        client = _client
        _database = None
        _client = None
        if client is not None:
            client.close()
            print("[MongoDB] Connection pool closed.")


def mongo_status() -> dict[str, str]:
    profile, uri, database_name = _settings()
    return {
        "profile": profile,
        "host": _safe_target(uri),
        "database": database_name,
        "connected": str(_database is not None).lower(),
    }
