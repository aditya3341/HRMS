import api from "./api";
import type { 
  PayrollRun, 
  PayrollEntry, 
  PayrollSimulationResponse,
  PayrollRunStatus,
} from "./types";

export const payrollApi = {
  previewPayroll: async (month: number, year: number): Promise<PayrollSimulationResponse> => {
    const res: any = await api.post("/payroll/preview", { month, year });
    return res.data || res;
  },

  runPayroll: async (month: number, year: number): Promise<PayrollRun> => {
    const res: any = await api.post("/payroll/run", { month, year });
    return res.data || res;
  },

  getRuns: async (): Promise<PayrollRun[]> => {
    const res: any = await api.get("/payroll/runs");
    return res.data || res;
  },

  getRunDetails: async (runId: string): Promise<{ run: PayrollRun; entries: PayrollEntry[] }> => {
    const res: any = await api.get(`/payroll/${runId}`);
    return res.data || res;
  },

  updateStatus: async (runId: string, status: PayrollRunStatus): Promise<PayrollRun> => {
    const res: any = await api.patch(`/payroll/${runId}/status`, { status });
    return res.data || res;
  },

  overrideEntry: async (
    entryId: string, 
    amount: number, 
    reason: string
  ): Promise<PayrollEntry> => {
    const res: any = await api.patch(`/payroll/entries/${entryId}/override`, { 
      override_amount: amount,
      reason: reason 
    });
    return res.data || res;
  },

  deleteRun: async (runId: string): Promise<{ message: string }> => {
    const res: any = await api.delete(`/payroll/${runId}`);
    return res.data || res;
  },

  getMyPayslips: async (): Promise<PayrollEntry[]> => {
    const res: any = await api.get("/payroll/me/payslips");
    return res.data || res;
  }
};
