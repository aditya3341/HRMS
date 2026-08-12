import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "./api";
import { toast } from "sonner";

export interface ITStockItem {
  id: string;
  category: string;
  item_name: string;
  brand_model: string;
  total_stock: string;
  issued_qty: string;
  remaining_qty: string;
  issued_to: string;
  department: string;
  issue_date: string;
  unit: string;
  reorder_required: string;
}

export const useStockItems = () => {
  return useQuery<ITStockItem[]>({
    queryKey: ["it-stock"],
    queryFn: async () => {
      const res = await api.get<ITStockItem[]>("/it-assets/stock");
      return res || [];
    },
  });
};

export const useCreateStockItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<ITStockItem>) => {
      return await api.post<ITStockItem>("/it-assets/stock", data);
    },
    onSuccess: () => {
      toast.success("New stock item added. Fill in details manually!");
      queryClient.invalidateQueries({ queryKey: ["it-stock"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create stock item");
    },
  });
};

export const useUpdateStockItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; payload: Partial<ITStockItem> }) => {
      return await api.put<any>(`/it-assets/stock/${data.id}`, data.payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["it-stock"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update stock item");
    },
  });
};

export const useDeleteStockItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return await api.delete<any>(`/it-assets/stock/${id}`);
    },
    onSuccess: () => {
      toast.success("Stock item deleted");
      queryClient.invalidateQueries({ queryKey: ["it-stock"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete stock item");
    },
  });
};
