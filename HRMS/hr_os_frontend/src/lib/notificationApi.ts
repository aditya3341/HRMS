import api from "./api";

export interface Notification {
  id: string;
  user_id: string;
  user_email: string;
  title: string;
  body: string;
  type: string;
  link?: string;
  read: boolean;
  created_at: string;
}

export const getNotifications = async (): Promise<Notification[]> => {
  return await api.get<Notification[]>("/notifications/");
};

export const markNotificationAsRead = async (notificationId: string): Promise<any> => {
  return await api.patch(`/notifications/${notificationId}/read`, {});
};
