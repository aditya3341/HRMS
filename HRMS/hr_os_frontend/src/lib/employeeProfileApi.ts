import api from './api';

export interface EmployeeBasic {
  id: string;
  user_id?: string | null;
  name: string;
  email: string;
  employee_code: string;
  designation: string;
  status: string;
  phone?: string | null;
  address?: string | null;
  emergency_contact?: string | null;
  pan?: string | null;
  aadhaar?: string | null;
  uan?: string | null;
  bank_account?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
}

export interface EmployeeJob {
  department: string;
  manager: string | null;
  date_of_joining: string | null;
}

export interface ReportingPerson {
  id: string;
  name: string;
}

export interface EmployeeReporting {
  manager: ReportingPerson | null;
  direct_reports: ReportingPerson[];
}

export interface ActivityEvent {
  type: string;
  timestamp: string;
}

export interface EmployeeProfile {
  basic: EmployeeBasic;
  job: EmployeeJob;
  reporting: EmployeeReporting;
  activity: ActivityEvent[];
}

export const fetchEmployeeProfile = async (id: string): Promise<EmployeeProfile> => {
  return await api.get(`/employees/${id}/profile`);
};

export const updateSelfProfile = async (data: Partial<EmployeeBasic>): Promise<any> => {
  return await api.patch(`/employee/me`, data);
};

export interface EmployeeDocument {
  id: string;
  employee_id: string;
  name: string;
  type: string;
  filename: string;
  path: string;
  uploaded_at: string;
  uploaded_by: string;
}

export const fetchEmployeeDocuments = async (employeeId: string): Promise<EmployeeDocument[]> => {
  return await api.get(`/employee-docs/${employeeId}`);
};

export const uploadEmployeeDocument = async (employeeId: string, docType: string, name: string, file: File): Promise<EmployeeDocument> => {
  const formData = new FormData();
  formData.append("doc_type", docType);
  formData.append("name", name);
  formData.append("file", file);
  return await api.post(`/employee-docs/${employeeId}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const deleteEmployeeDocument = async (employeeId: string, docId: string): Promise<any> => {
  return await api.delete(`/employee-docs/${employeeId}/${docId}`);
};
