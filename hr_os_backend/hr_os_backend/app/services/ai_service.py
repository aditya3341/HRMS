from typing import Any
from sqlalchemy.orm import Session
from app.models.system_config import SystemConfig
from app.utils.ai_engine import GeminiEngine
from app.services.fallback_service import FallbackService
import uuid

class AIService:
    @staticmethod
    def get_ai_config(db: Session) -> dict:
        return GeminiEngine.get_config(db)

    @staticmethod
    def parse_resume(db: Session, resume_text: str) -> dict:
        """
        AI Resume Parser using Gemini.
        """
        config = AIService.get_ai_config(db)
        
        if not config.get("enabled", True):
            print(" AI is DISABLED globally. Calling FallbackService...")
            return FallbackService.parse_resume_fallback(resume_text)
            
        print(f" AI is ENABLED (Provider: {config.get('provider', 'GEMINI')}). Calling Gemini...")
        
        prompt = f"""
        Extract structured information from this resume:
        {resume_text}
        
        Return JSON with fields:
        "skills": list of strings,
        "experience_years": number,
        "summary": brief string
        """
        
        try:
            return GeminiEngine.generate_json_response(db, prompt)
        except Exception as e:
            print(f" Gemini Error: {str(e)}. Falling back...")
            return FallbackService.parse_resume_fallback(resume_text)

    @staticmethod
    def generate_performance_insights(db: Session, review_id: uuid.UUID, current_user: dict) -> dict:
        """
        Generates performance analysis using dynamic Gemini LLM.
        """
        from app.models.performance import Review
        from app.models.ai_log import AILog
        from app.models.enums import AISource, AIUsageStatus
        
        config = AIService.get_ai_config(db)
        review = db.query(Review).filter(Review.id == review_id).first()
        if not review:
            raise Exception("Review not found")
            
        if not config.get("enabled", True):
            return {"summary": "AI is disabled.", "rating_suggestion": None}
            
        # Real Gemini Analysis
        prompt = f"""
        Analyze the following performance review for Employee {review.employee_id}:
        { [r.response_text for r in review.responses] }
        
        Provide:
        1. A concise summary of their progress.
        2. A numeric rating suggestion (1.0 to 5.0).
        """
        
        try:
            analysis = GeminiEngine.generate_json_response(db, prompt)
            
            log_entry = AILog(
                id=uuid.uuid4(),
                employee_id=review.employee_id,
                review_id=review.id,
                prompt=prompt,
                raw_response=str(analysis),
                parsed_output=analysis.get("summary", ""),
                confidence_score=0.9,
                source=AISource.AI,
                used_or_overridden=AIUsageStatus.PENDING
            )
            db.add(log_entry)
            db.commit()
            
            return {
                "log_id": str(log_entry.id), 
                "summary": analysis.get("summary", "Analysis complete."), 
                "rating_suggestion": analysis.get("rating_suggestion", 0)
            }
        except Exception as e:
            return {"summary": f"Could not generate insights: {str(e)}", "rating_suggestion": None}
