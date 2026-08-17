import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.auth.deps import get_current_user
from app.core.mongodb import get_mongo_db

client = TestClient(app)

@pytest.fixture
def superadmin_auth():
    entity_id = "Zipaworld"
    user_id = str(uuid.uuid4())
    mock_user = {
        "id": user_id,
        "user_id": user_id,
        "entity_id": entity_id,
        "employee_id": str(uuid.uuid4()),
        "role": "SUPER_ADMIN",
        "email": "admin@zipaworld.com"
    }
    app.dependency_overrides[get_current_user] = lambda: mock_user
    yield mock_user
    app.dependency_overrides.clear()

def test_delete_employee_by_id(superadmin_auth):
    db = get_mongo_db()
    emp_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    
    # Insert test employee
    db.employees.insert_one({
        "_id": emp_id,
        "id": emp_id,
        "user_id": user_id,
        "entity_id": superadmin_auth["entity_id"],
        "full_name": "Test Delete Employee",
        "email": f"delete_{emp_id}@test.com",
        "status": "ACTIVE"
    })
    
    # Verify employee exists
    assert db.employees.find_one({"_id": emp_id}) is not None
    
    # Call DELETE /employees/{emp_id}
    response = client.delete(f"/employees/{emp_id}")
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    
    # Verify employee was deleted from MongoDB
    assert db.employees.find_one({"_id": emp_id}) is None

def test_delete_employee_by_user_id(superadmin_auth):
    db = get_mongo_db()
    emp_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    
    # Insert test employee where _id is emp_id and user_id is user_id
    db.employees.insert_one({
        "_id": emp_id,
        "id": emp_id,
        "user_id": user_id,
        "entity_id": superadmin_auth["entity_id"],
        "full_name": "Test Delete Employee By User ID",
        "email": f"delete_user_{user_id}@test.com",
        "status": "ACTIVE"
    })
    
    # Call DELETE /employees/{user_id} (referencing user_id instead of employee _id)
    response = client.delete(f"/employees/{user_id}")
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    
    # Verify employee was deleted from MongoDB
    assert db.employees.find_one({"_id": emp_id}) is None
