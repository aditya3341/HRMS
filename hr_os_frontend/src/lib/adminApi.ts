import api from './api';

export const adminApi = {
  getRoles: async () => {
    return await api.get('/admin/roles');
  },
  
  createRole: async (roleData: { role: string, display_name: string, description?: string }) => {
    return await api.post('/admin/roles', roleData);
  },

  deleteRole: async (role: string) => {
    return await api.delete(`/admin/roles/${role}`);
  },
  
  getPermissions: async () => {
    return await api.get('/admin/permissions');
  },
  
  getRolePermissions: async (role: string) => {
    return await api.get(`/admin/roles/${role}/permissions`);
  },
  
  updateRolePermissions: async (role: string, permissions: string[]) => {
    return await api.patch(`/admin/roles/${role}/permissions`, { permissions });
  },
  
  updateUserRole: async (userId: string, role: string) => {
    return await api.patch(`/admin/users/${userId}/role`, { role });
  },

  updateUserDepartment: async (userId: string, departmentId: string | null) => {
    return await api.patch(`/admin/users/${userId}/department`, { department_id: departmentId });
  },

  getUserPermissions: async (userId: string) => {
    return await api.get(`/admin/users/${userId}/permissions`);
  },

  updateUserPermissions: async (userId: string, permissions: string[]) => {
    return await api.patch(`/admin/users/${userId}/permissions`, { permissions });
  },
  
  getDepartments: async () => {
    return await api.get('/admin/departments');
  },
  
  createDepartment: async (name: string) => {
    return await api.post('/admin/departments', { name });
  },
  
  searchUsers: async (query: string) => {
    return await api.get(`/admin/users/search?q=${query}`);
  },
  
  getAuditLogs: async (params?: { 
    action?: string; 
    user_id?: string; 
    module?: string; 
    resource_id?: string;
    limit?: number;
    offset?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.action) searchParams.append("action", params.action);
    if (params?.user_id) searchParams.append("user_id", params.user_id);
    if (params?.module) searchParams.append("module", params.module);
    if (params?.resource_id) searchParams.append("resource_id", params.resource_id);
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.offset) searchParams.append("offset", params.offset.toString());
    
    // Updated to use the new centralized audit endpoint
    const res = await api.get<any>(`/audit/logs?${searchParams.toString()}`);
    return res.items; // Backend returns wrapped in items
  },

  // Automation Rules
  getAutomationRules: async () => {
    return await api.get('/automation/rules');
  },
  createAutomationRule: async (data: any) => {
    return await api.post('/automation/rules', data);
  },
  toggleAutomationRule: async (ruleId: string, isActive: boolean) => {
    return await api.patch(`/automation/rules/${ruleId}?is_active=${isActive}`);
  }
};
