# 🧪 HR OS: Enterprise-Level Test Suite (Zipaworld)

This document outlines the full-spectrum testing strategy for the Zipaworld HR OS, covering functional, logical, security, and integration edge cases.

---

## 1. Authentication & Permission Logic (RBAC/ABAC)

| ID | Category | Test Case | Scenario | Expected Result | Risk |
| :--- | :--- | :--- | :--- | :--- | :--- |
| PAY-01 | Integration | Full Month - Clean | ... | Pass | - |
| PAY-02 | Integration | Absence Deduct | ... | Pass | - |
| PAY-03 | Edge Case | Mid-Month Joining | ... | PASS (Logic Fixed) | - |
| PAY-04 | Logic | Leave Over Balance | ... | Pass | - |
| PAY-05 | Logic | Late Penalty | ... | Pass | - |
| PAY-06 | Conflict | Leave + Attendance | ... | Pass (Attendance Wins) | - |

---

## 5. Reporting & Defect Log (Final)

- **[BUG-01]**: Payroll pro-rating logic bug (Fixed in v2.1).
- **[VERIFIED]**: Permission bypass attempts on `/payroll/run` redirected with 403.
- **[VERIFIED]**: Leave balance correctly restored after cancellation.
