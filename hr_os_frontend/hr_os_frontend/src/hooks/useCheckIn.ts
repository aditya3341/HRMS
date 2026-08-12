import { useMutation, useQueryClient } from "@tanstack/react-query";
import { checkIn } from "@/api/attendance";
import { toast } from "sonner";

export const useCheckIn = () => {
  const queryClient = useQueryClient();

  return useMutation<any, any, { latitude?: number; longitude?: number } | void>({
    mutationFn: checkIn,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["attendance", "me"] });
      toast.success(data.message || "Checked in successfully!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to check in");
    },
  });
};
