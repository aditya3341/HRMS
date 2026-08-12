import api from "./api";
import type {
  AttendanceRecord,
  AttendanceSummary,
  CheckInPayload,
  RegularizationRequest,
  RegularizationRecord,
  AttendanceSecurityConfig,
  AttendanceRegularizationConfig,
  BehaviorSummary,
  EmployeeTrustScore,
  FraudFlag,
  AttendanceModeConfig,
  AttendanceSummaryDaily,
} from "./types";

export const attendanceApi = {
  checkIn: async (payload?: CheckInPayload) => {
    return await api.post<AttendanceRecord>("/attendance/check-in", payload ?? {});
  },

  checkOut: async () => {
    return await api.post<AttendanceRecord>("/attendance/check-out");
  },

  getTodayStatus: async () => {
    return await api.get<AttendanceRecord>("/attendance/today");
  },

  getTodaySummary: async () => {
    // New Biometric-first Summary endpoint
    return await api.get<AttendanceSummaryDaily>("/attendance/today-summary");
  },

  getMyHistory: async (month?: number, year?: number) => {
    return await api.get<AttendanceRecord[]>("/attendance/me", {
      params: { month, year }
    });
  },

  getMonthlySummary: async (month?: number, year?: number) => {
    return await api.get<AttendanceSummary>("/attendance/summary", {
      params: { month, year }
    });
  },

  getTeamAttendance: async () => {
    return await api.get<AttendanceRecord[]>("/attendance/team");
  },

  getAdminAttendance: async (filters: {
    start_date?: string;
    end_date?: string;
    department_id?: string;
    employee_id?: string;
  }) => {
    return await api.get<AttendanceRecord[]>("/attendance/admin", {
      params: filters
    });
  },

  // --- Smart Attendance: Regularization ---
  submitRegularization: async (payload: RegularizationRequest) => {
    return await api.post<RegularizationRecord>("/attendance/regularize", payload);
  },

  getMyRegularizations: async () => {
    return await api.get<RegularizationRecord[]>("/attendance/regularize/me");
  },

  getPendingRegularizations: async () => {
    return await api.get<RegularizationRecord[]>("/attendance/regularize/pending");
  },

  approveRegularization: async (id: string, action: "APPROVED" | "REJECTED") => {
    return await api.post(`/attendance/regularize/${id}/action`, { action });
  },

  // --- Smart Attendance: Config ---
  getSecurityConfig: async (): Promise<AttendanceSecurityConfig | null> => {
    try {
      const res = await api.get<any>("/configs/ATTENDANCE_SECURITY_CONFIG");
      return res?.config_value ?? null;
    } catch {
      return null;
    }
  },

  getModeConfig: async (): Promise<AttendanceModeConfig | null> => {
    try {
      const res = await api.get<any>("/configs/ATTENDANCE_MODE_CONFIG");
      return res?.config_value ?? null;
    } catch {
      return null;
    }
  },

  getRegularizationConfig: async (): Promise<AttendanceRegularizationConfig | null> => {
    try {
      const res = await api.get<any>("/configs/ATTENDANCE_REGULARIZATION_CONFIG");
      return res?.config_value ?? null;
    } catch {
      return null;
    }
  },

  // --- Smart Attendance: Intelligence ---
  getBehavior: async (employeeId: string, month?: number, year?: number) => {
    return await api.get<BehaviorSummary>(`/attendance/behavior/${employeeId}`, {
      params: { month, year }
    });
  },

  getTrustScore: async (employeeId: string) => {
    return await api.get<EmployeeTrustScore>(`/attendance/trust-score/${employeeId}`);
  },

  getFraudFlags: async (employeeId: string) => {
    return await api.get<FraudFlag[]>(`/attendance/fraud/${employeeId}`);
  },

  getPendingFraud: async () => {
    return await api.get<FraudFlag[]>("/attendance/fraud/pending");
  },

  computeIntelligence: async (employeeId?: string) => {
    return await api.post("/attendance/intelligence/compute", { employee_id: employeeId });
  },
};

export type { AttendanceRecord, RegularizationRecord };
