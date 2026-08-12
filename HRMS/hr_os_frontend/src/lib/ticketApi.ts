import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "./api";
import { toast } from "sonner";
import type { APIResponse } from "./types";

export interface Ticket {
  id: string;
  title: string;
  description: string;
  category: "IT" | "ADMIN" | "FINANCE" | "HR";
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  created_by: string;
  created_by_name?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  assigned_by?: string;
  assigned_by_name?: string;
  assigned_at?: string;
  sla_deadline?: string;
  sla_status: "ON_TRACK" | "AT_RISK" | "BREACHED";
  created_at: string;
  updated_at: string;
  comments: TicketComment[];
  activities: TicketActivity[];
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  author_id: string;
  author_name?: string;
  message: string;
  created_at: string;
}

export interface TicketActivity {
  id: string;
  activity_type: string;
  description: string;
  actor_id: string;
  actor_name?: string;
  created_at: string;
}

export const useTickets = (filters: { 
  status?: string; 
  category?: string; 
  priority?: string;
  sla_status?: string;
  assigned_to_me?: boolean;
} = {}) => {
  return useQuery<{ items: Ticket[]; total: number }>({
    queryKey: ["tickets", filters],
    queryFn: async () => {
      return await api.get<{ items: Ticket[]; total: number }>("/tickets/", {
        params: filters,
      });
    },
  });
};

export const useTicket = (id: string) => {
  return useQuery<Ticket>({
    queryKey: ["ticket", id],
    queryFn: async () => {
      return await api.get<Ticket>(`/tickets/${id}`);
    },
    enabled: !!id,
  });
};

export const useCreateTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ticket: { title: string; description: string; category: string; priority: string }) => {
      return await api.post<Ticket>("/tickets/", ticket);
    },
    onSuccess: () => {
      toast.success("Ticket raised successfully");
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: () => {
      toast.error("Failed to raise ticket");
    },
  });
};

export const useAddComment = (ticketId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (message: string) => {
      return await api.post<any>(`/tickets/${ticketId}/comment`, { message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
    },
  });
};

export const useUpdateTicket = (ticketId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (update: { status?: string; priority?: string; assigned_to?: string }) => {
      return await api.patch<any>(`/tickets/${ticketId}`, update);
    },
    onSuccess: () => {
      toast.success("Ticket updated");
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
    },
  });
};

export const useAssignTicket = (ticketId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (assigned_to: string) => {
      return await api.patch<any>(`/tickets/${ticketId}/assign`, { assigned_to });
    },
    onSuccess: () => {
      toast.success("Ticket assigned");
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
    },
  });
};
