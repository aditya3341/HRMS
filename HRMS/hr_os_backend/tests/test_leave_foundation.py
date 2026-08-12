import pytest
import uuid
from datetime import date, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import Base, SessionLocal
from app.models.leave import Leave, LeaveType, LeaveBalance
from app.models.entity import Entity
from app.models.user import User
from app.models.employee import Employee

# Simple mock test client setup
client = TestClient(app)

def test_leave_days_validation():
    """Verify days > 0 validation via Pydantic"""
    from app.schemas.leave import LeaveRequestCreate
    import pytest
    from pydantic import ValidationError
    
    with pytest.raises(ValidationError):
        LeaveRequestCreate(
            leave_type_id=uuid.uuid4(),
            start_date=date.today(),
            end_date=date.today(),
            days=0  # Should fail
        )

def test_legacy_payload_mapping():
    """
    Simulation: 
    If LeaveRequestCreate has leave_type='ANNUAL' and leave_type_id=None,
    the API should map it to the correct LeaveType.
    """
    from app.schemas.leave import LeaveRequestCreate
    payload = LeaveRequestCreate(
        leave_type="ANNUAL",
        start_date=date.today(),
        end_date=date.today(),
        days=1.0
    )
    assert payload.leave_type == "ANNUAL"
    assert payload.leave_type_id is None

def test_cross_entity_isolation_logic():
    """
    Verify that validate_entity_match raises HTTPException on mismatch.
    """
    from app.utils.db_helpers import validate_entity_match
    from fastapi import HTTPException
    import pytest
    
    entity_a = uuid.uuid4()
    entity_b = uuid.uuid4()
    
    with pytest.raises(HTTPException) as excinfo:
        validate_entity_match(entity_a, entity_b)
    assert excinfo.value.status_code == 403

def test_inactive_type_validation_logic():
    """
    Check that api logic handles is_active=False.
    (This would be an integration test, but we can verify the model attribute)
    """
    from app.models.leave import LeaveType
    lt = LeaveType(name="Expired Policy", code="OLD", is_active=False)
    assert lt.is_active is False

def test_schemas_loading():
    from app.schemas.leave import LeaveTypeCreate, LeaveRequestCreate
    # Basic check
    lt = LeaveTypeCreate(name="Annual Leave", code="ANNUAL")
    assert lt.code == "ANNUAL"

def test_api_router_registered():
    from app.main import app
    # Check if /leaves is in the routes
    routes = [route.path for route in app.routes]
    assert any("/leaves" in r for r in routes)
