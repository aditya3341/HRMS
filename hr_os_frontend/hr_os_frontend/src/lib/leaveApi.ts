import api from "./api";
import type { 
  LeaveType, 
  LeaveBalance, 
  LeaveRequest, 
  Holiday, 
  LeaveRequestCreate,
  APIResponse,
  LeaveStats,
  LeaveCalendarEvent
} from "./types";

/**
 * Fetch all available leave types for the organization
 */
export const getLeaveTypes = async (): Promise<LeaveType[]> => {
  return await api.get("/leave/types");
};

export const getMyBalances = async (): Promise<LeaveBalance[]> => {
  return await api.get("/leave/balance/me");
};

export const getLeaves = async (employee_id?: string): Promise<LeaveRequest[]> => {
  return await api.get("/leaves/", {
    params: { employee_id }
  });
};

export const getMyLeaves = () => getLeaves();

export const getTeamLeaves = async (status?: string): Promise<LeaveRequest[]> => {
  return await api.get("/leaves/requests/team", {
    params: { status }
  });
};

export const applyLeave = async (payload: LeaveRequestCreate): Promise<LeaveRequest> => {
  return await api.post("/leaves/", payload);
};

export const approveLeave = async (id: string, action: "APPROVED" | "REJECTED", remarks?: string): Promise<LeaveRequest> => {
  return await api.post(`/leaves/${id}/approve`, {
    action,
    remarks
  });
};

export const getEmployeeBalances = async (employeeId: string, year?: number): Promise<LeaveBalance[]> => {
  return await api.get(`/leaves/balance/${employeeId}`, {
    params: { year }
  });
};

export const getHolidays = async (year?: number): Promise<Holiday[]> => {
  return await api.get("/leave/holidays", {
    params: { year }
  });
};

export const getNotifications = async (): Promise<any[]> => {
  return await api.get("/notifications/");
};

export const markNotificationAsRead = async (id: string): Promise<any> => {
  return await api.post(`/notifications/${id}/read`);
};

export const updateLeaveType = async (id: string, payload: Partial<LeaveType>): Promise<LeaveType> => {
  return await api.patch(`/leave/types/${id}`, payload);
};

export const getMyLeaveStats = async (year?: number): Promise<LeaveStats> => {
  return await api.get("/leave/stats/me", {
    params: { year }
  });
};

export const getLeaveCalendar = async (month: number, year: number, team_view: boolean = false): Promise<LeaveCalendarEvent[]> => {
  return await api.get("/leave/calendar", {
    params: { month, year, team_view }
  });
};

export const cancelLeave = async (id: string): Promise<boolean> => {
  return await api.post(`/leave/${id}/cancel`);
};
