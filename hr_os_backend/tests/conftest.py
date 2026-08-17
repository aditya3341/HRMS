import pytest

# Ensure all SQLAlchemy models are imported on test startup so the mapper registry can resolve all relationship references.
try:
    from app.models.entity import Entity
    from app.models.user import User
    from app.models.notification import Notification
    from app.models.leave import Leave, LeaveType, LeaveBalance, Holiday
    from app.models.audit_log import AuditLog
    from app.models.ai_log import AILog
    from app.models.job import Job
    from app.models.application import Application
    from app.models.interview_log import InterviewLog
    from app.models.offer import Offer
    from app.models.employee import Employee
    from app.models.attendance import Attendance
    from app.models.biometric_device import BiometricDevice
    from app.models.salary_structure import SalaryStructure
    from app.models.payroll import PayrollRun, PayrollEntry
    from app.models.it_asset import ITAsset
    from app.models.it_ticket import ITTicket
    from app.models.permission import Permission
    from app.models.role_permission import RolePermission
    from app.models.performance import Review, PerformanceCycle, ReviewSummary
    from app.models.performance_history import AppraisalRecord, PromotionRecord, SalaryHistory, PerformanceSnapshot
    from app.models.ticket import Ticket, TicketComment
    from app.models.automation_rule import AutomationRule
except Exception as e:
    print(f"Warning during test models import: {e}")
