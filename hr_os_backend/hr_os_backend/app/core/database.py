"""MongoDB-native database helpers for the HRMS backend.

Provides:
- ``get_db()``  – FastAPI dependency yielding the shared PyMongo Database
- ``get_collection(name)`` – quick accessor for a named collection
- ``Base`` – kept purely for import compatibility (models still use it for
  schema documentation; no SQL engine is created)
"""

from sqlalchemy.orm import DeclarativeBase

from app.core.mongodb import get_mongo_db
from app.core.mongo_session import MongoSession


class Base(DeclarativeBase):
    """Legacy model metadata — kept only so model files still import cleanly."""


SessionLocal = MongoSession
engine = None



def get_db():
    """FastAPI dependency: yields the shared PyMongo Database instance."""
    return get_mongo_db()


def get_collection(name: str):
    """Return a PyMongo collection by name from the shared database."""
    return get_mongo_db()[name]
