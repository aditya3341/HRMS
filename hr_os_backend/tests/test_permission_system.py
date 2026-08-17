import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.auth.deps import get_current_user
from app.core.mongodb import get_mongo_db

client = TestClient(app)

# Use SUPER_ADMIN to mock a superadmin bypass
@pytest.fixture
def superadmin_auth():
    mock_user = {
        "user_id": str(uuid.uuid4()),
        "entity_id": str(uuid.uuid4()),
        "employee_id": str(uuid.uuid4()),
        "role": "SUPER_ADMIN",
        "email": "admin@test.com"
    }
    app.dependency_overrides[get_current_user] = lambda: mock_user
    yield mock_user
    app.dependency_overrides.clear()

def test_list_permissions(superadmin_auth):
    response = client.get("/admin/permissions")
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert "data" in res
    assert isinstance(res["data"], dict)
    # Check if grouped categories are returned
    if res["data"]:
        category = list(res["data"].keys())[0]
        assert isinstance(res["data"][category], list)

def test_role_lifecycle(superadmin_auth):
    db = get_mongo_db()
    
    # Create role
    role_name = "TEST_ROLE_" + str(uuid.uuid4())[:8].upper()
    payload = {
        "role": role_name,
        "display_name": "Test Custom Role",
        "description": "Custom role for unit testing."
    }
    response = client.post("/admin/roles", json=payload)
    assert response.status_code == 200
    assert response.json()["success"] is True
    
    # List roles to verify it exists
    response = client.get("/admin/roles")
    assert response.status_code == 200
    roles = response.json()["data"]
    assert any(r["role"] == role_name for r in roles)
    
    # Assign permissions
    perm_payload = {"permissions": ["dashboard.read", "employee.self"]}
    response = client.patch(f"/admin/roles/{role_name}/permissions", json=perm_payload)
    assert response.status_code == 200
    assert response.json()["success"] is True
    
    # Get permissions
    response = client.get(f"/admin/roles/{role_name}/permissions")
    assert response.status_code == 200
    assert response.json()["data"] == ["dashboard.read", "employee.self"]
    
    # Delete role
    response = client.delete(f"/admin/roles/{role_name}")
    assert response.status_code == 200
    assert response.json()["success"] is True

def test_user_permissions_override(superadmin_auth):
    target_user_id = str(uuid.uuid4())
    
    # Get user permissions (should be empty initially)
    response = client.get(f"/admin/users/{target_user_id}/permissions")
    assert response.status_code == 200
    assert response.json()["data"] == []
    
    # Set user permission override
    payload = {"permissions": ["leave.approve", "payroll.read"]}
    response = client.patch(f"/admin/users/{target_user_id}/permissions", json=payload)
    assert response.status_code == 200
    assert response.json()["success"] is True
    
    # Retrieve and verify overrides
    response = client.get(f"/admin/users/{target_user_id}/permissions")
    assert response.status_code == 200
    assert set(response.json()["data"]) == {"leave.approve", "payroll.read"}
