class Permissions:
    # Dashboard
    DASHBOARD_READ = "dashboard.read"

    ADMIN = "admin"
    ADMIN_WRITE = "admin_write"

    # Jobs
    JOB_CREATE = "job.create"
    JOB_READ = "job.read"

    # Applications
    APPLICATION_READ = "application.read"
    APPLICATION_REVIEW = "application.review"

    # Offers
    OFFER_CREATE = "offer.create"
    OFFER_APPROVE = "offer.approve"
    OFFER_SEND = "offer.send"
    OFFER_READ = "offer.read"
    OFFER_ACCEPT = "offer.accept" # Internal mapping if needed

    # Onboarding
    ONBOARDING_START = "onboarding.start"
    ONBOARDING_READ = "onboarding.read"
    ONBOARDING_MANAGE = "onboarding.manage"

    # Attendance
    ATTENDANCE_READ = "attendance.read"
    ATTENDANCE_CHECKIN = "attendance.checkin"
    ATTENDANCE_CHECKOUT = "attendance.checkout"
    ATTENDANCE_MARK = "attendance.mark"

    # Payroll
    PAYROLL_READ = "payroll.read"
    PAYROLL_RUN = "payroll.run"

    # IT Assets & Tickets
    ASSET_READ = "asset.read"
    ASSET_MANAGE = "asset.manage"
    TICKET_READ = "ticket.read"
    TICKET_UPDATE = "ticket.update"

    # Biometric Devices
    BIOMETRIC_READ = "biometric.read"
    BIOMETRIC_MANAGE = "biometric.manage"

    # Leaves
    LEAVE_READ = "leave.read"
    LEAVE_REQUEST = "leave.request"
    LEAVE_APPROVE = "leave.approve"

    # Notifications
    NOTIFICATION_READ = "notification.read"
    NOTIFICATION_SEND = "notification.send"

    # Employee Self-Service
    EMPLOYEE_SELF = "employee.self"
    
    # Employees (HR)
    EMPLOYEE_CREATE = "employee.create"
    EMPLOYEE_READ = "employee.read"
    EMPLOYEE_VIEW = "employee.view"
    EMPLOYEE_UPDATE = "employee.update"
    
    # Resumes
    RESUME_UPLOAD = "resume.upload"

    # Performance
    PERFORMANCE_VIEW = "performance.view"
    PERFORMANCE_MANAGE = "performance.manage"
    PERFORMANCE_ADMIN = "performance.admin"
    APPRAISAL_MANAGE = "appraisal.manage"
    PROMOTION_MANAGE = "promotion.manage"

    # Entities
    ENTITY_READ = "entity.read"
    ENTITY_MANAGE = "entity.manage"
