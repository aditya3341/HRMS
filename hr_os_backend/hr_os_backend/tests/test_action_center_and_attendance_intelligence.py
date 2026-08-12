import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.auth.deps import get_current_user
from app.core.mongodb import get_mongo_db

client = TestClient(app)

# Override the authentication dependency to return a mock manager user
@pytest.fixture(autouse=True)
def override_auth():
    # Fetch an employee from the test database to make it realistic
    db = get_mongo_db()
    emp = db.employees.find_one({"email": "rahul@company.com"})
    if emp:
        mock_user = {
            "user_id": emp.get("user_id"),
            "entity_id": emp.get("entity_id"),
            "employee_id": emp.get("_id"),
            "roles": ["MANAGER"]
        }
    else:
        # Fallback to random uuids
        mock_user = {
            "user_id": str(uuid.uuid4()),
            "entity_id": str(uuid.uuid4()),
            "employee_id": str(uuid.uuid4()),
            "roles": ["MANAGER"]
        }
    
    app.dependency_overrides[get_current_user] = lambda: mock_user
    yield
    app.dependency_overrides.clear()


def test_action_center_endpoint():
    response = client.get("/approvals/action-center")
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["success"] is True
    assert "data" in res_json
    data = res_json["data"]
    assert "pending" in data
    assert "summary" in data
    assert "recent_activity" in data


def test_pending_fraud_endpoint():
    response = client.get("/attendance/fraud/pending")
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["success"] is True
    assert "data" in res_json


def test_employee_fraud_flags_endpoint():
    db = get_mongo_db()
    emp = db.employees.find_one({"email": "rahul@company.com"})
    emp_id = emp["_id"] if emp else str(uuid.uuid4())
    
    response = client.get(f"/attendance/fraud/{emp_id}")
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["success"] is True


def test_trust_score_endpoint():
    db = get_mongo_db()
    emp = db.employees.find_one({"email": "rahul@company.com"})
    emp_id = emp["_id"] if emp else str(uuid.uuid4())
    
    response = client.get(f"/attendance/trust-score/{emp_id}")
    assert response.status_code in (200, 404) # Might return 404 if employee does not exist, but should be 200 if seeded
    if response.status_code == 200:
        res_json = response.json()
        assert res_json["success"] is True
        assert "score" in res_json["data"]


def test_behavior_endpoint():
    db = get_mongo_db()
    emp = db.employees.find_one({"email": "rahul@company.com"})
    emp_id = emp["_id"] if emp else str(uuid.uuid4())
    
    response = client.get(f"/attendance/behavior/{emp_id}")
    assert response.status_code in (200, 404)
    if response.status_code == 200:
        res_json = response.json()
        assert res_json["success"] is True


def test_compute_intelligence_endpoint():
    db = get_mongo_db()
    emp = db.employees.find_one({"email": "rahul@company.com"})
    emp_id = emp["_id"] if emp else None
    
    payload = {"employee_id": emp_id} if emp_id else {}
    response = client.post("/attendance/intelligence/compute", json=payload)
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["success"] is True
    assert "data" in res_json
