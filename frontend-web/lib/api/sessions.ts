import apiClient from './client';
import { Session, PaginatedResponse } from '@/lib/types';

export const sessionsApi = {
  /**
   * Get sessions (filtered by role on backend)
   * - Students: only see sessions of classes they're enrolled in
   * - Teachers: only see their own sessions
   * - Admins: see all sessions
   */
  getAll: async (params?: {
    page?: number;
    per_page?: number;
    status?: string;
    class_id?: number;
  }): Promise<PaginatedResponse<Session>> => {
    const response = await apiClient.get<{ sessions: PaginatedResponse<Session> }>('/sessions', {
      params,
    });
    return response.data.sessions;
  },

  /**
   * Alias for getAll (used by admin/teacher pages)
   */
  getAllTeacher: async (params?: {
    page?: number;
    per_page?: number;
    status?: string;
    class_id?: number;
  }): Promise<PaginatedResponse<Session>> => {
    const response = await apiClient.get<{ sessions: PaginatedResponse<Session> }>('/sessions', {
      params,
    });
    return response.data.sessions;
  },

  /**
   * Get session by ID (authorization checked on backend)
   */
  getById: async (id: number): Promise<Session> => {
    const response = await apiClient.get<{ session: Session }>(`/sessions/${id}`);
    return response.data.session;
  },

  /**
   * Get Zoom link from session data (uses class zoom_link)
   */
  getZoomLink: (session: Session): string | null => {
    return session.class?.zoom_link || null;
  },

  /**
   * Create session (teacher/admin)
   */
  create: async (data: Partial<Session>): Promise<Session> => {
    const response = await apiClient.post<{ session: Session }>('/sessions', data);
    return response.data.session;
  },

  /**
   * Update session (teacher)
   */
  update: async (id: number, data: Partial<Session>): Promise<Session> => {
    const response = await apiClient.put<{ session: Session }>(`/sessions/${id}`, data);
    return response.data.session;
  },

  /**
   * Delete session (teacher)
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/sessions/${id}`);
  },
};

export default sessionsApi;
