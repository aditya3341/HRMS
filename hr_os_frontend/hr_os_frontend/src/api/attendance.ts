import api from "@/lib/api";

export interface AttendanceRecord {
  date: string;
  status: string;
  check_in: string | null;
  check_out: string | null;
  total_hours: number | null;
  is_late?: boolean;
}

export interface AttendanceAlert {
  name: string;
  late_count: number;
}

export interface AttendanceAlertsResponse {
  late_employees: AttendanceAlert[];
}

export const checkIn = async (data?: { latitude?: number; longitude?: number }) => {
  return await api.post("/attendance/check-in", data);
};

export const checkOut = async () => {
  return await api.post("/attendance/check-out");
};

export const getMyAttendance = async (params?: { month?: number; year?: number }) => {
  return await api.get<AttendanceRecord[]>("/attendance/me", { params });
};

export const getAttendanceAlerts = async () => {
  return await api.get<AttendanceAlertsResponse>("/attendance/alerts");
};

export const getTeamAttendance = async () => {
  return await api.get("/attendance/team");
};
