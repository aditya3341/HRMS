import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "./api";
import { toast } from "sonner";

export interface ActionCenterData {
  pending: any[];
  summary: {
    total_pending: number;
    offers: number;
    onboarding: number;
  };
  recent_activity: any[];
}

export const useActionCenterData = () => {
  return useQuery<ActionCenterData>({
    queryKey: ["action-center"],
    queryFn: async () => {
      return await api.get<ActionCenterData>("/approvals/action-center");
    },
    refetchInterval: 30_000,        // Poll every 30 seconds
    refetchOnWindowFocus: true,     // Refresh when switching back to tab
    staleTime: 20_000,              // Treat data fresh for 20s to prevent redundant fetches
  });
};

export const useProcessAction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, action, remarks }: { requestId: string; action: string; remarks?: string; actionType?: string }) => {
      return await api.post(
        `/approvals/requests/${requestId}/action`,
        { action, remarks }
      );
    },
    onMutate: async (variables) => {
      // Optimistic update: Remove the item from pending list immediately
      await queryClient.cancelQueries({ queryKey: ["action-center"] });
      const previousData = queryClient.getQueryData<ActionCenterData>(["action-center"]);

      if (previousData) {
        queryClient.setQueryData(["action-center"], {
          ...previousData,
          pending: previousData.pending.filter((item) => item.id !== variables.requestId),
          summary: {
            ...previousData.summary,
            total_pending: previousData.summary.total_pending - 1,
            offers: variables.actionType === "OFFER" ? previousData.summary.offers - 1 : previousData.summary.offers,
            onboarding: variables.actionType === "ONBOARDING" ? previousData.summary.onboarding - 1 : previousData.summary.onboarding,
          },
        });
      }

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["action-center"], context.previousData);
      }
      toast.error("Failed to process action");
    },
    onSuccess: () => {
      toast.success("Action processed successfully");
      queryClient.invalidateQueries({ queryKey: ["action-center"] });
    },
  });
};
