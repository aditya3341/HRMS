import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { payrollApi } from "@/lib/payrollApi";
import type { PayrollRunStatus } from "@/lib/types";
import { toast } from "sonner";

export const usePayrollRuns = () => {
  return useQuery({
    queryKey: ["payroll", "runs"],
    queryFn: payrollApi.getRuns,
  });
};

export const useMyPayslips = () => {
  return useQuery({
    queryKey: ["payroll", "me", "payslips"],
    queryFn: payrollApi.getMyPayslips,
  });
};


export const usePayrollDetail = (runId: string | null) => {
  return useQuery({
    queryKey: ["payroll", "run", runId],
    queryFn: () => payrollApi.getRunDetails(runId!),
    enabled: !!runId,
  });
};

export const usePayrollPreview = () => {
  return useMutation({
    mutationFn: ({ month, year }: { month: number; year: number }) => 
      payrollApi.previewPayroll(month, year),
  });
};

export const useRunPayroll = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ month, year }: { month: number; year: number }) => 
      payrollApi.runPayroll(month, year),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll"] });
      toast.success("Payroll executed successfully");
    },
  });
};

export const useUpdatePayrollStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ runId, status }: { runId: string; status: PayrollRunStatus }) => 
      payrollApi.updateStatus(runId, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["payroll"] });
      toast.success(`Payroll status updated to ${variables.status}`);
    },
  });
};

export const useOverridePayroll = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, amount, reason }: { entryId: string; amount: number; reason: string }) => 
      payrollApi.overrideEntry(entryId, amount, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll"] });
      toast.success("Salary override applied and logged");
    },
  });
};
