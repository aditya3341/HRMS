import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyBalances, getMyLeaves, applyLeave, approveLeave } from "@/lib/leaveApi";
import type { LeaveRequestCreate } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";

export const useLeaveBalances = () => {
  const { employeeId, isAuthenticated } = useAppStore();
  return useQuery({
    queryKey: ["leaves", "balances"],
    queryFn: getMyBalances,
    enabled: isAuthenticated && !!employeeId,
  });
};

export const useMyLeaves = () => {
  const { employeeId, isAuthenticated } = useAppStore();
  return useQuery({
    queryKey: ["leaves", "me"],
    queryFn: getMyLeaves,
    enabled: isAuthenticated && !!employeeId,
  });
};

export const useApplyLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LeaveRequestCreate) => applyLeave(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      toast.success("Leave application submitted successfully");
    },
  });
};

export const useApproveLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, remarks }: { id: string; action: "APPROVED" | "REJECTED"; remarks?: string }) => 
      approveLeave(id, action, remarks),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      toast.success(`Leave ${variables.action.toLowerCase()} successfully`);
    },
  });
};
