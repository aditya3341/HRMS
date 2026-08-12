import api from "./api";

export const getLeaveOverview = async () => {
  return await api.get("/leave-analytics/overview");
};

export const getLeaveTrends = async () => {
  return await api.get("/leave-analytics/trends");
};

export const getLeaveDistribution = async () => {
  return await api.get("/leave-analytics/distribution");
};

export const getLeaveByDepartment = async () => {
  return await api.get("/leave-analytics/department");
};

export const getLeaveInsights = async () => {
  return await api.get("/leave-analytics/insights");
};
