import time
import os
import requests
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("attendance-worker")

# Configurations
SIMULATOR_URL = os.getenv("SIMULATOR_URL", "http://localhost:8001")
HRMS_API_URL = os.getenv("HRMS_API_URL", "http://localhost:8000")
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", "10")) # seconds
DEVICE_SERIAL = os.getenv("DEVICE_SERIAL", "BX_DEVICE_01")

def run_sync():
    logger.info(f"Starting sync cycle. Device: {SIMULATOR_URL}, HRMS: {HRMS_API_URL}")
    
    # Track successfully synced logs to avoid spamming (index-based)
    synced_timestamps = set()
    
    while True:
        try:
            # 1. Fetch logs from simulator
            logs_url = f"{SIMULATOR_URL}/api/device/logs"
            logger.debug(f"Fetching logs from {logs_url}...")
            response = requests.get(logs_url, timeout=5.0)
            
            if response.status_code == 200:
                logs = response.json()
                logger.info(f"Fetched {len(logs)} logs from device simulator.")
                
                # 2. Iterate and push to HRMS
                for log in logs:
                    uid = log.get("uid")
                    timestamp = log.get("timestamp")
                    punch_type = log.get("type", "IN")
                    
                    # Construct a unique key for deduplication in worker memory
                    key = f"{uid}_{timestamp}"
                    if key in synced_timestamps:
                        continue
                    
                    # Convert device format to HRMS format
                    payload = {
                        "employee_code": uid,
                        "timestamp": timestamp,
                        "device_id": DEVICE_SERIAL,
                        "punch_type": punch_type,
                        "raw_payload": {
                            "source": "Attendance Bridge Worker",
                            "sync_mode": "PULL_POLLING"
                        }
                    }
                    
                    # Push to HRMS
                    push_url = f"{HRMS_API_URL}/attendance/punch"
                    logger.info(f"Syncing punch to HRMS: {push_url} with payload {payload}")
                    res = requests.post(push_url, json=payload, timeout=5.0)
                    
                    if res.status_code in (200, 201):
                        logger.info(f"Successfully synced punch for {uid} at {timestamp}.")
                        synced_timestamps.add(key)
                    else:
                        logger.error(f"Failed to sync punch for {uid}. Status: {res.status_code}, Res: {res.text}")
            else:
                logger.error(f"Failed to fetch logs from simulator. Status: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Error in sync worker cycle: {e}")
            
        time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    logger.info("BioMax Attendance Bridge Sync Worker started...")
    # Give services a few seconds to start up in docker-compose
    time.sleep(5)
    run_sync()
