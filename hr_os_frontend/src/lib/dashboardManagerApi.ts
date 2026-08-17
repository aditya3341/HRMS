import api from "@/lib/api";
import type { APIResponse, ManagerDashboardData } from "@/lib/types";

export async function fetchManagerDashboard(): Promise<ManagerDashboardData> {
  return await api.get<ManagerDashboardData>("/dashboard/manager");
}
