import api from '@/lib/api';

export interface BiometricMapping {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  device_enrollment_id: string;
  source_device_name?: string;
  created_at: string;
}

export interface MappingCreate {
  employee_id: string;
  device_enrollment_id: string;
  source_device_id?: string;
}

export const biometricMappingApi = {
  list: async () => {
    const response = await api.get<BiometricMapping[]>('/biometric/mappings/');
    return response;
  },
  
  create: async (data: MappingCreate) => {
    const response = await api.post<BiometricMapping>('/biometric/mappings/', data);
    return response;
  },
  
  delete: async (id: string) => {
    const response = await api.delete(`/biometric/mappings/${id}`);
    return response;
  }
};
