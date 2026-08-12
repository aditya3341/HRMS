import api from "./api";
import type { Employee } from "./types";

export const employeeApi = {
  getEmployees: async () => {
    const res: any = await api.get("/employees/");
    return res.data || res;
  },

  getEmployeeLookup: async () => {
    const res: any = await api.get("/employees/lookup");
    return res.data || res;
  },

  getEmployeeById: async (id: string) => {
    const res: any = await api.get(`/employees/${id}`);
    return res.data || res;
  },

  getMyProfile: async () => {
    const res: any = await api.get("/employees/me");
    return res.data || res;
  },

  updateEmployee: async (id: string, payload: Partial<Employee>) => {
    const res: any = await api.patch(`/employees/${id}`, payload);
    return res.data || res;
  },

  startOnboarding: async (employeeId: string) => {
    const res: any = await api.post(`/employees/${employeeId}/onboarding/start`);
    return res.data || res;
  },
  
  getUnmappedUsers: async () => {
    const res: any = await api.get("/employees/unmapped-users");
    return res.data || res;
  },

  getDepartments: async () => {
    const res: any = await api.get("/admin/departments");
    return res.data || res;
  },
};
