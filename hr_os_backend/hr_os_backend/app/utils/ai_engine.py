import re
import json
import requests
import google.generativeai as genai
from sqlalchemy.orm import Session
from pymongo.database import Database
from app.models.system_config import SystemConfig
from fastapi import HTTPException

class GeminiEngine:
    @staticmethod
    def get_config(db) -> dict:
        """
        Fetches the AI configuration from the database.
        Supports both MongoSession and native PyMongo Database objects.
        """
        if not isinstance(db, Database):
            config = db.query(SystemConfig).filter(SystemConfig.config_key == "AI_CONFIG").first()
            if config:
                return config.config_value
        else:
            config = db.system_configs.find_one({"config_key": "AI_CONFIG"})
            if config:
                return config.get("config_value") or {}

        return {
            "enabled": True,
            "provider": "GEMINI",
            "api_key": "",
            "model_name": "gemini-2.5-flash",
            "temperature": 0.7,
            "confidence_threshold": 0.5,
            "features": {
                "summary": True,
                "rating_suggestion": True,
                "risk_detection": True,
                "resume_parsing": True
            }
        }

    @staticmethod
    def generate_response(db: Session, prompt: str, temperature: float = None) -> str:
        """
        Generates a text response using the configured AI provider, model, and api key.
        """
        config = GeminiEngine.get_config(db)
        if not config.get("enabled", True):
            raise HTTPException(status_code=400, detail="AI services are currently disabled.")
            
        provider = config.get("provider", "GEMINI").upper()
        # Backwards compatibility: fallback to gemini_api_key if api_key is empty
        api_key = config.get("api_key") or config.get("gemini_api_key")
        model_name = config.get("model_name")
        temp = temperature if temperature is not None else config.get("temperature", 0.7)

        if not api_key:
            raise HTTPException(
                status_code=400, 
                detail=f"API Key is not configured for provider {provider}. Please configure it in AI Settings."
            )

        if provider == "GEMINI":
            try:
                genai.configure(api_key=api_key)
                model_to_use = model_name or "gemini-2.5-flash"
                model = genai.GenerativeModel(model_to_use)
                
                # Configure temperature
                generation_config = genai.types.GenerationConfig(
                    temperature=temp
                )
                response = model.generate_content(prompt, generation_config=generation_config)
                return response.text
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Gemini AI Error: {str(e)}")

        elif provider == "CHATGPT" or provider == "OPENAI":
            try:
                model_to_use = model_name or "gpt-4o"
                url = "https://api.openai.com/v1/chat/completions"
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": model_to_use,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": temp
                }
                response = requests.post(url, headers=headers, json=payload, timeout=30)
                if response.status_code != 200:
                    raise Exception(f"HTTP {response.status_code}: {response.text}")
                
                res_json = response.json()
                return res_json["choices"][0]["message"]["content"]
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"ChatGPT/OpenAI Error: {str(e)}")

        elif provider == "DEEPSEEK":
            try:
                model_to_use = model_name or "deepseek-chat"
                url = "https://api.deepseek.com/chat/completions"
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": model_to_use,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": temp
                }
                response = requests.post(url, headers=headers, json=payload, timeout=30)
                if response.status_code != 200:
                    raise Exception(f"HTTP {response.status_code}: {response.text}")
                
                res_json = response.json()
                return res_json["choices"][0]["message"]["content"]
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"DeepSeek AI Error: {str(e)}")

        elif provider == "BLACKBOX":
            try:
                model_to_use = model_name or "blackbox"
                # Blackbox OpenAI-compatible API endpoint
                url = "https://api.blackbox.ai/api/v1/chat/completions"
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": model_to_use,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": temp
                }
                response = requests.post(url, headers=headers, json=payload, timeout=30)
                if response.status_code != 200:
                    raise Exception(f"HTTP {response.status_code}: {response.text}")
                
                res_json = response.json()
                return res_json["choices"][0]["message"]["content"]
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Blackbox AI Error: {str(e)}")

        else:
            raise HTTPException(status_code=400, detail=f"Unknown AI Provider: {provider}")

    @staticmethod
    def generate_json_response(db: Session, prompt: str) -> dict:
        """
        Specially tuned for JSON output (useful for resume parsing / analysis).
        """
        try:
            # Force JSON-like structure in prompt
            full_prompt = f"{prompt}\nReturn ONLY a valid JSON object."
            raw_text = GeminiEngine.generate_response(db, full_prompt)
            
            # Use regex to find the first { and last } to avoid markdown backticks
            match = re.search(r"(\{.*\})", raw_text, re.DOTALL)
            if match:
                return json.loads(match.group(1))
            return json.loads(raw_text)
        except Exception as e:
             raise HTTPException(status_code=500, detail=f"AI JSON Parse Error: {str(e)}")
