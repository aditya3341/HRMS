import api from "@/lib/api";

export interface PayrollRun {
  id: string;
  month: number;
  year: number;
  status: string;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  created_at: string;
  processed_at?: string;
}

export interface PayrollItem {
  id: string;
  employee_id: string;
  employee_name?: string;
  basic: number;
  hra: number;
  allowances: number;
  bonus: number;
  pf: number;
  esi: number;
  tax: number;
  leave_deduction: number;
  gross_salary: number;
  total_deductions: number;
  net_salary: number;
}

export const getPayrollRuns = async () => {
  const data = await api.get("/payroll/runs");
  return data as PayrollRun[];
};

export const runPayroll = async (month: number, year: number) => {
  const data = await api.post("/payroll/run", { month, year });
  return data as PayrollRun;
};

export const getPayrollDetail = async (id: string) => {
  const data = await api.get(`/payroll/runs/${id}`);
  return data as PayrollRun;
};

export const getPayslipDownloadUrl = (payrollId: string) => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
  return `${apiBaseUrl}/api/v1/payroll/${payrollId}/payslip`;
};
