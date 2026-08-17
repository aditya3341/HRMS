from api_test_client import HRMSClient

def test_rbac():
    admin = HRMSClient()
    employee = HRMSClient()
    
    print("--- RBAC Testing ---")
    
    # Login as Super Admin
    s1, r1 = admin.login("admin@aaa2.com", "admin123")
    print(f"Admin Login: {s1}")
    
    # Login as Employee
    s2, r2 = employee.login("rahul@company.com", "admin123") # Assuming same test pass
    print(f"Employee Login: {s2}")
    
    # Test 1: Admin accessing departments (Blocked for non-admins)
    code, res = admin.get("/admin/departments")
    print(f"Admin Access /admin/departments: {code}")
    
    code, res = employee.get("/admin/departments")
    print(f"Employee Access /admin/departments: {code}")
    if code == 200:
        print("!!! SECURITY GAP: Employee accessed admin endpoint !!!")
    else:
        print(f"Access blocked (expected): {res}")
    
    # Test 2: Employee accessing own profile
    code, res = employee.get("/employee/self/me")
    print(f"Employee Access /employee/self/me: {code}")

if __name__ == "__main__":
    test_rbac()
