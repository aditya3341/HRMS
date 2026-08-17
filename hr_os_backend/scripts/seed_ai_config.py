import uuid
from datetime import datetime
from sqlalchemy import create_url
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from app.models.system_config import SystemConfig

def seed_ai_config():
    db: Session = SessionLocal()
    try:
        # Check if AI_CONFIG exists
        config = db.query(SystemConfig).filter(SystemConfig.config_key == "AI_CONFIG").first()
        
        ai_payload = {
            "enabled": True,
            "provider": "GEMINI",
            "gemini_api_key": "PASTE_YOUR_GEMINI_API_KEY_HERE",
            "features": {
                "summary": True,
                "rating_suggestion": True,
                "risk_detection": True,
                "resume_parsing": True
            }
        }

        if config:
            print(f"Updating existing AI_CONFIG...")
            # Merge existing values if any, but ensure gemini_api_key exists
            new_val = {**ai_payload, **config.config_value}
            if "gemini_api_key" not in new_val:
                new_val["gemini_api_key"] = ""
            config.config_value = new_val
        else:
            print(f"Creating new AI_CONFIG...")
            config = SystemConfig(
                id=uuid.uuid4(),
                config_key="AI_CONFIG",
                config_value=ai_payload,
                description="Global AI & LLM settings (Gemini, OpenAI, etc.)",
                is_active=True,
                updated_at=datetime.utcnow()
            )
            db.add(config)
        
        db.commit()
        print("AI_CONFIG seeded successfully!")
    except Exception as e:
        print(f"Error seeding AI_CONFIG: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_ai_config()
