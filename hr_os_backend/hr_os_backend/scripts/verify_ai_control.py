import os
import sys

# Add backend to path
sys.path.append(r'd:\Projects_Core\HRMS\hr_os_backend')

from app.core.database import SessionLocal
from app.services.ai_service import AIService
from app.models.system_config import SystemConfig

def verify_ai_logic():
    db = SessionLocal()
    try:
        # 1. Test ENABLED state
        print("--- Testing AI ENABLED ---")
        cfg = db.query(SystemConfig).filter(SystemConfig.config_key == "AI_CONFIG").first()
        cfg.config_value = {**cfg.config_value, "enabled": True}
        db.commit()
        
        result_enabled = AIService.parse_resume(db, "Python Developer with 5 years experience.")
        print(f"Result (Enabled): {result_enabled.get('method', 'ai_parser')}")

        # 2. Test DISABLED state
        print("\n--- Testing AI DISABLED ---")
        cfg.config_value = {**cfg.config_value, "enabled": False}
        db.commit()
        
        result_disabled = AIService.parse_resume(db, "Python Developer with 5 years experience.")
        print(f"Result (Disabled): {result_disabled.get('method', 'ai_parser')}")

        if result_disabled.get("method") == "rule_based_fallback":
            print("\n✅ Verification SUCCESS: Fallback logic correctly invoked when AI is disabled.")
        else:
            print("\n❌ Verification FAILED: Fallback logic NOT invoked.")

    finally:
        db.close()

if __name__ == "__main__":
    verify_ai_logic()
