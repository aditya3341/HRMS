# 📌 EXECUTIVE SUMMARY

The **HR OS (Human Resource Operating System)** is an enterprise-grade, modular HR management platform built specifically for **Zipaworld**.

### Current Status
- **Core Engine**: Production-ready.
- **Intelligent Payroll**: **Complete** (Syncs with Attendance/Leaves).
- **Attendance Management**: **Complete** (LATE/HALF_DAY logic).
- **Employee Dashboard**: **Complete** (Premium Glassmorphism).
- **Leave Management**: **Complete**.

---

# 🧱 SYSTEM ARCHITECTURE

## 💰 INTELLIGENT PAYROLL ENGINE (NEW)

### Dynamic Rule-Based Calculation
The system reconciles salary based on real-time employee activity:
- **Working Days**: Auto-excludes weekends (Sat/Sun) and Organization Holidays.
- **Attendance Sync**: 
  - `ABSENT` status deducts 1.0 day from salary.
  - `HALF_DAY` deducts 0.5 day (unless covered by leave).
  - `LATE` arrivals (3+) trigger a 0.5 day penalty.
- **Leave Integration**: 
  - Approved `PAID` leaves prevent LOP for absent days.
  - Approved `UNPAID` or exceeded balance leaves trigger LOP.
- **Mid-Month Processing**: Pro-rates salary based on `date_of_joining`.
- **HR Override**: Admins can manually adjust salary deductions via the Dashboard before finalization.

### Data Model ([PayrollEntry](file:///d:/Projects_Core/HRMS/hr_os_frontend/src/lib/payrollApi.ts#18-47))
- `total_working_days`, `present_days`, `leave_days`, `lop_days`.
- `lop_deduction`, `attendance_deduction`, `override_amount`.

---

# 🧱 COMPONENT REGISTRY

- **Backend**: [PayrollService](file:///d:/Projects_Core/HRMS/hr_os_backend/app/services/payroll_service.py#14-249) (intelligent reconciliation logic).
- **API**: `PATCH /payroll/entries/{id}/override`.
- **Frontend**: [PayrollDashboard](file:///d:/Projects_Core/HRMS/hr_os_frontend/src/pages/payroll/PayrollDashboard.tsx#26-315) (admin view) and [PayslipView](file:///d:/Projects_Core/HRMS/hr_os_frontend/src/pages/payroll/PayslipView.tsx#23-205) (granular stats).

---

# 🚀 DEPLOYMENT & OPERATION

### Critical Maintenance
1. **Holiday Sync**: Ensure the [Holidays](file:///d:/Projects_Core/HRMS/hr_os_frontend/src/lib/leaveApi.ts#76-85) table is populated for the current year to ensure accurate [working_days](file:///d:/Projects_Core/HRMS/hr_os_backend/app/services/leave_service.py#14-101) calculation.
2. **Review Cycle**: HR must review entries in the Dashboard and apply any overrides before moving status to `PAID`.

---

# 📌 HANDOVER CHECKLIST
- [x] Verify [working_days](file:///d:/Projects_Core/HRMS/hr_os_backend/app/services/leave_service.py#14-101) calculation excludes weekends and festive holidays.
- [x] Test pro-rated salary for an employee joining on the 10th of the month.
- [x] Ensure Manual Override correctly adjusts `net_salary` on the Dashboard.
- [x] Validate granular metrics on the Employee Payslip.
