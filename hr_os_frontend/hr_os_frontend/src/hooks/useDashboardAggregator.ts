import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { attendanceApi } from "@/lib/attendanceApi";
import { getMyApprovals } from "@/lib/approvalApi";
import api from "@/lib/api";
import type { 
  EmployeeInsightData, 
  AttendanceSummaryDaily, 
  ApprovalRequestResponse,
  Notification 
} from "@/lib/types";

export interface DashboardAggregatedData {
  profile: EmployeeInsightData | null;
  attendanceToday: AttendanceSummaryDaily | null;
  pendingApprovals: ApprovalRequestResponse[];
  notifications: Notification[];
  loading: boolean;
}

export function useDashboardAggregator(): DashboardAggregatedData {
  const { user } = useAuth();
  const employeeId = user?.employee_id;

  // 1. Personal AI Insights & Trust Score
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["dashboard-me"],
    queryFn: async () => {
      return await api.get<EmployeeInsightData>("/dashboard/me");
    },
    enabled: !!user,
  });

  // 2. Today's Attendance Snapshot
  const { data: attendanceToday, isLoading: attendanceLoading } = useQuery({
    queryKey: ["attendance-today-summary"],
    queryFn: async () => {
      return await attendanceApi.getTodaySummary();
    },
    enabled: !!user,
  });

  // 3. Pending Approvals (for Priority Bar)
  const { data: approvals, isLoading: approvalsLoading } = useQuery({
    queryKey: ["myApprovals"],
    queryFn: getMyApprovals,
    enabled: !!user,
    refetchInterval: 30000,
  });

  // 4. Notifications (Alerts)
  const { data: notifications, isLoading: notificationsLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      return await api.get<Notification[]>("/notifications/") || [];
    },
    enabled: !!user,
  });

  return {
    profile: profile || null,
    attendanceToday: attendanceToday || null,
    pendingApprovals: approvals || [],
    notifications: notifications || [],
    loading: profileLoading || attendanceLoading || approvalsLoading || notificationsLoading,
  };
}
