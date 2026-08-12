import requests
import json

BASE_URL = "http://localhost:8000"

class HRMSClient:
    def __init__(self):
        self.token = None
        self.headers = {"Content-Type": "application/json"}

    def login(self, email, password):
        url = f"{BASE_URL}/auth/login"
        data = {"email": email, "password": password}
        response = requests.post(url, json=data)
        if response.status_code == 200:
            res_json = response.json()
            # The backend login endpoint returns the token directly, not wrapped in {success: True, data: ...}
            if "access_token" in res_json:
                self.token = res_json["access_token"]
                self.headers["Authorization"] = f"Bearer {self.token}"
                return True, res_json
        return False, response.json()

    def get(self, endpoint):
        url = f"{BASE_URL}{endpoint}"
        response = requests.get(url, headers=self.headers)
        return response.status_code, response.json()

    def post(self, endpoint, data):
        url = f"{BASE_URL}{endpoint}"
        response = requests.post(url, json=data, headers=self.headers)
        return response.status_code, response.json()

if __name__ == "__main__":
    client = HRMSClient()
    
    # Test 1: Valid Login
    success, res = client.login("admin@aaa2.com", "admin123")
    print(f"Login Success: {success}")
    if success:
        token_prefix = client.token[:10] if client.token else "None"
        print(f"Token: {token_prefix}...")
    else:
        print(f"Error: {res}")

    # Test 2: Invalid Login
    success, res = client.login("admin@aaa2.com", "wrongpass")
    print(f"Invalid Login (should be False): {success}")
    print(f"Response: {res}")
