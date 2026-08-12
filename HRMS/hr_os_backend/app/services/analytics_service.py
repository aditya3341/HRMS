import uuid
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.performance import Review, ReviewSummary
from app.models.performance_history import AppraisalRecord, PerformanceSnapshot
from app.models.employee import Employee
from app.models.department import Department

class AnalyticsService:
    @staticmethod
    def get_org_overview(db: Session, cycle_id: uuid.UUID) -> Dict[str, Any]:
        # 1. Band Distribution
        band_counts = db.query(
            ReviewSummary.performance_band,
            func.count(ReviewSummary.id)
        ).join(Review, ReviewSummary.review_id == Review.id)\
         .filter(Review.cycle_id == cycle_id)\
         .group_by(ReviewSummary.performance_band).all()
         
        distribution = {band: count for band, count in band_counts}
        
        # 2. Average Rating
        avg_rating = db.query(func.avg(ReviewSummary.final_score))\
            .join(Review, ReviewSummary.review_id == Review.id)\
            .filter(Review.cycle_id == cycle_id).scalar() or 0.0
            
        # 3. Total Reviews
        total_reviews = db.query(func.count(Review.id))\
            .filter(Review.cycle_id == cycle_id).scalar() or 0
            
        # 4. Average Increment (from locked appraisals)
        avg_increment = db.query(func.avg(AppraisalRecord.increment_percentage))\
            .join(Review, AppraisalRecord.review_id == Review.id)\
            .filter(Review.cycle_id == cycle_id).scalar() or 0.0
            
        # 5. Promotion Count
        promotion_count = db.query(func.count(PerformanceSnapshot.id))\
            .filter(PerformanceSnapshot.cycle_id == cycle_id, PerformanceSnapshot.promotion_flag == True).scalar() or 0
            
        return {
            "average_rating": round(avg_rating, 2),
            "total_reviews": total_reviews,
            "band_distribution": distribution,
            "average_increment_pct": round(avg_increment, 2),
            "promotion_rate": round((promotion_count / total_reviews * 100), 2) if total_reviews > 0 else 0.0
        }

    @staticmethod
    def get_team_analytics(db: Session, cycle_id: uuid.UUID) -> List[Dict[str, Any]]:
        # Aggregate by department
        results = db.query(
            Department.id,
            Department.name,
            func.avg(ReviewSummary.final_score).label("avg_score"),
            func.count(ReviewSummary.id).label("participation")
        ).select_from(ReviewSummary)\
         .join(Review, ReviewSummary.review_id == Review.id)\
         .join(Employee, ReviewSummary.employee_id == Employee.id)\
         .join(Department, Employee.department_id == Department.id)\
         .filter(Review.cycle_id == cycle_id)\
         .group_by(Department.id, Department.name).all()
         
        return [
            {
                "department_id": str(r.id),
                "department_name": r.name,
                "average_score": round(r.avg_score, 2),
                "participation": r.participation
            } for r in results
        ]

    @staticmethod
    def get_performance_trends(db: Session, employee_id: uuid.UUID) -> List[Dict[str, Any]]:
        # Historical snapshots
        snapshots = db.query(PerformanceSnapshot)\
            .filter(PerformanceSnapshot.employee_id == employee_id)\
            .order_by(PerformanceSnapshot.created_at.asc()).all()
            
        return [
            {
                "date": s.created_at.strftime("%b %Y"),
                "rating": s.rating,
                "band": s.band
            } for s in snapshots
        ]
