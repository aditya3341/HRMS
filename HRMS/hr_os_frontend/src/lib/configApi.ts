import api from "./api";

export const configApi = {
  getAll: async () => {
    return await api.get("/configs/");
  },
  getByKey: async (key: string) => {
    return await api.get(`/configs/${key}`);
  },
  update: async (key: string, config_value: Record<string, unknown>, description?: string) => {
    return await api.put(`/configs/${key}`, { config_value, description });
  },
  getHistory: async (key: string) => {
    return await api.get(`/configs/${key}/history`);
  },
  setPayrollLock: async (cycle_id: string, is_locked: boolean) => {
    return await api.post("/configs/payroll-lock", { cycle_id, is_locked });
  },
  getPayrollLock: async (cycle_id: string) => {
    return await api.get(`/configs/payroll-lock/${cycle_id}`);
  },
};
