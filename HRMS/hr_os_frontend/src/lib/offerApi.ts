import api from "./api";

export const offerApi = {
  approveOffer: async (offerId: string) => {
    return await api.post(`/offers/${offerId}/approve`);
  },
  rejectOffer: async (offerId: string, reason?: string) => {
    return await api.post(`/offers/${offerId}/reject`, { reason });
  },
  sendOffer: async (offerId: string) => {
    return await api.post(`/offers/${offerId}/send`);
  },
  acceptOffer: async (offerId: string) => {
    return await api.post(`/offers/${offerId}/accept`);
  },
  declineOffer: async (offerId: string) => {
    return await api.post(`/offers/${offerId}/decline`);
  },
  markJoined: async (offerId: string) => {
    return await api.post(`/offers/${offerId}/mark-joined`);
  },
};
