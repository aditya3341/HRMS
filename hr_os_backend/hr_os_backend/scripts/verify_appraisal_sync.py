import os
import uuid
import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"
# Mocking a superadmin for testing
HEADERS = {
    "Authorization": "Bearer test-superadmin-token" # In real scenario, would login first
}

def test_appraisal_lifecycle():
    print("🚀 Starting Appraisal Lifecycle Verification...")
    
    # 1. Get Cycles
    resp = requests.get(f"{BASE_URL}/performance/cycles", headers=HEADERS)
    cycles = resp.json()
    if not cycles:
        print("❌ No cycles found. Seed data first.")
        return
    
    cycle_id = cycles[0]['id']
    print(f"✅ Using Cycle: {cycles[0]['name']} ({cycle_id})")

    # 2. Generate Recommendations
    print(f"📦 Generating recommendations for cycle {cycle_id}...")
    resp = requests.post(f"{BASE_URL}/performance/appraisal/generate/{cycle_id}", headers=HEADERS)
    if resp.status_code != 200:
        print(f"❌ Failed to generate recommendations: {resp.text}")
        return
    appraisals = resp.json()
    print(f"✅ Generated {len(appraisals)} appraisal records.")

    if not appraisals:
        print("⚠️ No appraisals to process. Ensure reviews are completed.")
        return

    # 3. Update an Appraisal (Override)
    appraisal = appraisals[0]
    appraisal_id = appraisal['id']
    print(f"✍️ Updating appraisal for {appraisal.get('employee_name', 'Employee')}...")
    update_data = {
        "increment_percentage": 15.5,
        "reason": "Exceptional performance in Phase 3"
    }
    resp = requests.patch(f"{BASE_URL}/performance/appraisal/{appraisal_id}/update", json=update_data, headers=HEADERS)
    if resp.status_code == 200:
        print(f"✅ Appraisal updated to 15.5%")
    else:
        print(f"❌ Failed to update appraisal: {resp.text}")

    # 4. Lock Appraisal (Sync to Payroll)
    print(f"🔒 Locking appraisal {appraisal_id}...")
    resp = requests.post(f"{BASE_URL}/performance/appraisal/{appraisal_id}/lock", headers=HEADERS)
    if resp.status_code == 200:
        print(f"✅ Appraisal locked. Payroll sync triggered.")
        locked_data = resp.json()
        print(f"📊 New Salary: {locked_data['new_salary']}")
    else:
        print(f"❌ Failed to lock appraisal: {resp.text}")

def test_promotion_workflow():
    print("\n🚀 Starting Promotion Workflow Verification...")
    
    # 1. List Promotions
    resp = requests.get(f"{BASE_URL}/performance/promotions", headers=HEADERS)
    if resp.status_code != 200:
        print(f"❌ Failed to list promotions: {resp.text}")
        return
    promotions = resp.json()
    print(f"✅ Found {len(promotions)} promotion records.")

    if not promotions:
        print("⚠️ No pending promotions found.")
        return

    promotion = promotions[0]
    print(f"🏆 Approving promotion for {promotion.get('employee_name', 'Employee')} to {promotion['proposed_designation']}...")
    
    resp = requests.post(f"{BASE_URL}/performance/promotion/{promotion['id']}/approve", headers=HEADERS)
    if resp.status_code == 200:
        print(f"✅ Promotion approved successfully.")
    else:
        print(f"❌ Failed to approve promotion: {resp.text}")

if __name__ == "__main__":
    # Note: Requires a valid token. In a real test environment, we'd authenticate first.
    # For this simulation, assuming the dev server has a bypass or the token is valid.
    test_appraisal_lifecycle()
    test_promotion_workflow()
