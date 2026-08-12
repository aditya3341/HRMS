import { useMutation, useQueryClient } from "@tanstack/react-query";
import { checkOut } from "@/api/attendance";
import { toast } from "sonner";

export const useCheckOut = () => {
  const queryClient = useQueryClient();

  return useMutation<any, any, void>({
    mutationFn: checkOut,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["attendance", "me"] });
      toast.success(data.message || "Checked out successfully!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to check out");
    },
  });
};
