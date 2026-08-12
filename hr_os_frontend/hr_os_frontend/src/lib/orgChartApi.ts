import api from './api';

export interface OrgNodeData {
  id: string;
  name: string;
  designation: string;
  department: string;
  children: OrgNodeData[];
}

export interface OrgChartResponse {
  status: string;
  data: OrgNodeData[];
}

export const fetchOrgChart = async (): Promise<OrgNodeData[]> => {
  return await api.get<OrgNodeData[]>('/org-chart');
};
