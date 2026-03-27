import apiClient from './client';
import { Enrollment } from '@/lib/types';

export const enrollmentsApi = {
  /**
   * Get current student's enrollments
   */
  getMyEnrollments: async (): Promise<Enrollment[]> => {
    const response = await apiClient.get<{ enrollments: Enrollment[] }>('/enrollments');
    return response.data.enrollments;
  },

  /**
   * Get all enrollments (admin only)
   */
  getAll: async (params?: {
    status?: string;
    class_id?: number;
    program_id?: number;
    search?: string;
  }): Promise<Enrollment[]> => {
    const response = await apiClient.get<{ enrollments: Enrollment[] }>('/admin/enrollments', {
      params,
    });
    return response.data.enrollments;
  },

  /**
   * Get a single enrollment by ID (admin only)
   */
  getById: async (id: number): Promise<Enrollment> => {
    const response = await apiClient.get<{ enrollment: Enrollment }>(`/admin/enrollments/${id}`);
    return response.data.enrollment;
  },

  /**
   * Create enrollment (admin only)
   */
  create: async (data: {
    student_id: number;
    class_id: number;
    expires_at?: string
  }): Promise<{ enrollment: Enrollment; message: string }> => {
    const response = await apiClient.post<{ enrollment: Enrollment; message: string }>('/enrollments', data);
    return response.data;
  },

  /**
   * Update enrollment status (admin only)
   */
  update: async (id: number, data: {
    status?: string;
    expires_at?: string
  }): Promise<{ enrollment: Enrollment; message: string }> => {
    const response = await apiClient.put<{ enrollment: Enrollment; message: string }>(`/enrollments/${id}`, data);
    return response.data;
  },

  /**
   * Delete enrollment (admin only)
   */
  delete: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/enrollments/${id}`);
    return response.data;
  },
};

export default enrollmentsApi;
