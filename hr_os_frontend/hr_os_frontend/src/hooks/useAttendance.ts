import { useQuery } from "@tanstack/react-query";
import { attendanceApi } from "@/lib/attendanceApi";

export const useAttendance = () => {
  return useQuery({
    queryKey: ["attendance-today"],
    queryFn: () => attendanceApi.getTodayStatus(),
    refetchInterval: 60000, // Poll every minute
  });
};

export const useAttendanceModeConfig = () => {
  return useQuery({
    queryKey: ["attendance-mode-config"],
    queryFn: () => attendanceApi.getModeConfig(),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};

export const useTodaySummary = () => {
  return useQuery({
    queryKey: ["attendance-today-summary"],
    queryFn: () => attendanceApi.getTodaySummary(),
    refetchInterval: 60000,
  });
};

export const useAttendanceHistory = (month?: number, year?: number) => {
  return useQuery({
    queryKey: ["attendance", "history", month, year],
    queryFn: () => attendanceApi.getMyHistory(month, year),
    staleTime: 1000 * 60 * 5,
  });
};
