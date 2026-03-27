import apiClient from './client';
import { Notification, NotificationUnreadCount, PaginatedResponse } from '@/lib/types';

interface NotificationsResponse {
  notifications: PaginatedResponse<Notification>;
}

const notificationsApi = {
  // Liste des notifications
  getAll: async (params?: {
    type?: string;
    unread?: boolean;
    per_page?: number;
    page?: number;
  }): Promise<PaginatedResponse<Notification>> => {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append('type', params.type);
    if (params?.unread) queryParams.append('unread', 'true');
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
    if (params?.page) queryParams.append('page', params.page.toString());

    const response = await apiClient.get<NotificationsResponse>(
      `/notifications?${queryParams.toString()}`
    );
    return response.data.notifications;
  },

  // Nombre de notifications non lues
  getUnreadCount: async (): Promise<NotificationUnreadCount> => {
    const response = await apiClient.get<NotificationUnreadCount>('/notifications/unread-count');
    return response.data;
  },

  // Marquer une notification comme lue
  markAsRead: async (id: number): Promise<Notification> => {
    const response = await apiClient.post<{ notification: Notification }>(
      `/notifications/${id}/mark-read`
    );
    return response.data.notification;
  },

  // Marquer toutes les notifications comme lues
  markAllAsRead: async (): Promise<{ updated_count: number }> => {
    const response = await apiClient.post<{ updated_count: number }>(
      '/notifications/mark-all-read'
    );
    return response.data;
  },

  // Marquer toutes les notifications d'un type comme lues
  markTypeAsRead: async (type: string): Promise<{ updated_count: number }> => {
    const response = await apiClient.post<{ updated_count: number }>(
      `/notifications/mark-type-read/${type}`
    );
    return response.data;
  },

  // Supprimer une notification
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/notifications/${id}`);
  },

  // Supprimer toutes les notifications lues
  deleteRead: async (): Promise<{ deleted_count: number }> => {
    const response = await apiClient.delete<{ deleted_count: number }>(
      '/notifications/read/all'
    );
    return response.data;
  },
};

export default notificationsApi;
