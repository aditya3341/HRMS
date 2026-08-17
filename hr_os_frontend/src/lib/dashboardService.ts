import api from "./api";
import { 
  HRIntelligenceData, 
  ManagerIntelligenceData, 
  EmployeeInsightData 
} from "./types";

export const dashboardService = {
  getHRIntelligence: async () => {
    return await api.get<HRIntelligenceData>("/dashboard/hr-intelligence");
  },

  getManagerDashboard: async () => {
    // Existing endpoint updated to include intelligence
    return await api.get<any>("/dashboard/manager");
  },

  getEmployeeInsights: async () => {
    return await api.get<EmployeeInsightData>("/dashboard/me");
  }
};
