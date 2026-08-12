import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface BiometricDevice {
  id: string;
  entity_id: string;
  name: string;
  connection_type: 'PULL' | 'PUSH' | 'FILE';
  device_code: string;
  ip_address?: string;
  port?: number;
  api_url?: string;
  status: 'ACTIVE' | 'INACTIVE';
  last_sync_at?: string;
  registered_by?: string;
  created_at: string;
}

export const useBiometricDevices = () => {
  return useQuery({
    queryKey: ['biometric-devices'],
    queryFn: async () => {
      const data = await api.get<BiometricDevice[]>('/biometric/devices/');
      return data;
    },
  });
};

export const useAddDevice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (device: Omit<BiometricDevice, 'id' | 'created_at' | 'last_sync_at' | 'registered_by' | 'entity_id'>) => {
      // The backend expects specific fields. It ignores null/undefined properly via Pydantic.
      const payload = {
          ...device,
          entity_id: "default" // If entity isolation is in place, the backend sets this, but providing a default might be required by schema
      };
      const data = await api.post<BiometricDevice>('/biometric/devices/', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['biometric-devices'] });
    },
  });
};

export const useUpdateDevice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BiometricDevice> & { id: string }) => {
      // Stripping restricted/immutable fields for the PATCH request
      const allowedUpdates = {
        name: updates.name,
        ip_address: updates.ip_address,
        port: updates.port,
        status: updates.status,
        api_url: updates.api_url,
      };
      
      const data = await api.patch<BiometricDevice>(`/biometric/devices/${id}`, allowedUpdates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['biometric-devices'] });
    },
  });
};
