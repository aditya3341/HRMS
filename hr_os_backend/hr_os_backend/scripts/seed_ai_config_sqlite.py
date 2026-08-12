import os
import sqlite3
import uuid
import json
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "sql_app.db")

def seed_ai_config_sqlite():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if AI_CONFIG exists
        cursor.execute("SELECT id, config_value FROM system_configs WHERE config_key = 'AI_CONFIG'")
        row = cursor.fetchone()
        
        ai_payload = {
            "enabled": True,
            "provider": "GEMINI",
            "gemini_api_key": "YOUR_GEMINI_API_KEY_HERE",
            "features": {
                "summary": True,
                "rating_suggestion": True,
                "risk_detection": True,
                "resume_parsing": True
            }
        }

        if row:
            print("Updating existing AI_CONFIG...")
            config_id, existing_val_str = row
            existing_val = json.loads(existing_val_str)
            new_val = {**ai_payload, **existing_val}
            if "gemini_api_key" not in new_val:
                new_val["gemini_api_key"] = ""
            
            cursor.execute(
                "UPDATE system_configs SET config_value = ?, updated_at = ? WHERE id = ?",
                (json.dumps(new_val), datetime.utcnow().isoformat(), config_id)
            )
        else:
            print("Creating new AI_CONFIG...")
            new_id = str(uuid.uuid4())
            cursor.execute(
                "INSERT INTO system_configs (id, config_key, config_value, description, is_active, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                (new_id, "AI_CONFIG", json.dumps(ai_payload), "Global AI & LLM settings (Gemini, OpenAI, etc.)", 1, datetime.utcnow().isoformat())
            )
        
        conn.commit()
        print("AI_CONFIG seeded successfully via SQLite!")
    except Exception as e:
        print(f"SQLite Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    seed_ai_config_sqlite()
