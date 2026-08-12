export const ROLE_PERMISSIONS = {
  SUPER_ADMIN: [
    "dashboard",
    "jobs",
    "applications",
    "offers",
    "onboarding",
    "attendance",
    "payroll",
    "it_assets",
    "it_tickets",
  ],

  HR_ADMIN: [
    "dashboard",
    "jobs",
    "applications",
    "offers",
    "onboarding",
    "attendance",
  ],

  HR_RECRUITER: [
    "dashboard",
    "jobs",
    "applications",
    "interviews",
  ],

  IT_ADMIN: [
    "dashboard",
    "it_assets",
    "it_tickets",
  ],

  EMPLOYEE: [
    "dashboard",
    "attendance",
    "it_tickets",
  ],
} as const;