import { useQuery } from "@tanstack/react-query";
import { getAttendanceAlerts } from "@/api/attendance";

export const useAttendanceAlerts = () => {
  return useQuery({
    queryKey: ["attendance", "alerts"],
    queryFn: getAttendanceAlerts,
    refetchInterval: 1000 * 60 * 15, // Refetch every 15 minutes
  });
};
