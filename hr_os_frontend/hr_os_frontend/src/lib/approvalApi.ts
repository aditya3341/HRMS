import api from "./api";
import { ApprovalRequestResponse, ApprovalTimelineStepResponse, ApprovalActionRequest } from "./types";

export const getMyApprovals = async (): Promise<ApprovalRequestResponse[]> => {
  return await api.get<ApprovalRequestResponse[]>("/approvals/requests/my");
};

export const getAllApprovals = async (): Promise<ApprovalRequestResponse[]> => {
  return await api.get<ApprovalRequestResponse[]>("/approvals/requests/all");
};

export const getApprovalTimeline = async (id: string): Promise<ApprovalTimelineStepResponse[]> => {
  return await api.get<ApprovalTimelineStepResponse[]>(`/approvals/requests/${id}/timeline`);
};

export const submitApprovalAction = async (id: string, payload: ApprovalActionRequest): Promise<ApprovalRequestResponse> => {
  return await api.post<ApprovalRequestResponse>(`/approvals/requests/${id}/action`, payload);
};

export const getApprovalAnalytics = async (params: { days?: number | null, module?: string, status?: string }) => {
  const query = new URLSearchParams();
  if (params.days) query.append('days', params.days.toString());
  if (params.module && params.module !== 'ALL') query.append('module', params.module);
  if (params.status && params.status !== 'ALL') query.append('status', params.status);
  
  const data = await api.get(`/approvals/analytics?${query.toString()}`);
  return data;
};
