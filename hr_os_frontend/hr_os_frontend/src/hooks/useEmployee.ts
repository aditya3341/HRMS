import { useQuery } from "@tanstack/react-query";
import { employeeApi } from "@/lib/employeeApi";
import { useAppStore } from "@/store/useAppStore";

export const useEmployee = () => {
  const { employeeId, isAuthenticated } = useAppStore();

  return useQuery({
    queryKey: ["employee", "me"],
    queryFn: () => employeeApi.getMyProfile(),
    staleTime: 1000 * 60 * 15, // 15 minutes
    enabled: isAuthenticated && !!employeeId,
  });
};
