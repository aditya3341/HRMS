import api from "./api";

export const getCycles = async () => {
  const response = await api.get("/performance/cycles");
  return response;
};

export const getKpas = async () => {
  const response = await api.get("/performance/kpa");
  return response;
};

export const getMyGoals = async (cycleId: string) => {
  const response = await api.get(`/performance/goals/my?cycle_id=${cycleId}`);
  return response;
};

export const createOrUpdateGoals = async (payload: any) => {
  const response = await api.post("/performance/goals", payload);
  return response;
};

export const submitGoals = async (goalId: string) => {
  const response = await api.post(`/performance/goals/submit?goal_id=${goalId}`);
  return response;
};

export const approveGoals = async (goalId: string) => {
  const response = await api.post(`/performance/goals/${goalId}/approve`);
  return response;
};

export const startReview = async (employeeId: string, cycleId: string) => {
  const response = await api.post(`/performance/review/start?employee_id=${employeeId}&cycle_id=${cycleId}`);
  return response;
};

export const getReview = async (reviewId: string) => {
  const response = await api.get(`/performance/review/${reviewId}`);
  return response;
};

export const submitSelfReview = async (reviewId: string, responses: any[]) => {
  const response = await api.post(`/performance/review/self?review_id=${reviewId}`, { responses });
  return response;
};

export const submitManagerReview = async (reviewId: string, responses: any[]) => {
  const response = await api.post(`/performance/review/manager?review_id=${reviewId}`, { responses });
  return response;
};

export const getGoalConfig = async () => {
  const response = await api.get("/configs/GOAL_SETTINGS_CONFIG");
  return response.config_value;
};

// Phase 3: Appraisal & Promotions
export const generateRecommendations = async (cycleId: string) => {
  const response = await api.post(`/performance/appraisal/generate/${cycleId}`);
  return response;
};

export const getAppraisals = async (cycleId: string) => {
  const response = await api.get(`/performance/appraisals?cycle_id=${cycleId}`);
  return response;
};

export const updateAppraisal = async (appraisalId: string, payload: { increment_percentage: number; reason: string }) => {
  const response = await api.patch(`/performance/appraisal/${appraisalId}/update`, payload);
  return response;
};

export const lockAppraisal = async (appraisalId: string) => {
  const response = await api.post(`/performance/appraisal/${appraisalId}/lock`);
  return response;
};

export const evaluatePromotion = async (employeeId: string) => {
  const response = await api.get(`/performance/promotion/evaluate/${employeeId}`);
  return response;
};

export const proposePromotion = async (payload: { employee_id: string; proposed_designation: string; promotion_reason: string; review_id?: string }) => {
  const response = await api.post("/performance/promotion/propose", payload);
  return response;
};

export const approvePromotion = async (promotionId: string) => {
  const response = await api.post(`/performance/promotion/${promotionId}/approve`);
  return response;
};

export const getPromotions = async (cycleId?: string) => {
  const url = cycleId ? `/performance/promotions?cycle_id=${cycleId}` : "/performance/promotions";
  const response = await api.get(url);
  return response;
};

// Phase 3: Analytics
export const getOrgOverview = async (cycleId: string) => {
  const response = await api.get(`/analytics/overview/${cycleId}`);
  return response;
};

export const getTeamAnalytics = async (cycleId: string) => {
  const response = await api.get(`/analytics/teams/${cycleId}`);
  return response;
};

export const getEmployeeTrends = async (employeeId: string) => {
  const response = await api.get(`/analytics/trends/${employeeId}`);
  return response;
};

export const getAIConfig = async () => {
  const response = await api.get("/configs/AI_CONFIG");
  return response.config_value;
};
