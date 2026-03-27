import apiClient from './client';
import { ClassModel, PaginatedResponse, ClassStudent, Session } from '@/lib/types';

export const classesApi = {
  /**
   * Get all classes (teacher/admin)
   */
  getAll: async (params?: {
    page?: number;
    per_page?: number;
    program_id?: number;
    academic_year?: string;
    status?: string;
  }): Promise<PaginatedResponse<ClassModel>> => {
    const response = await apiClient.get<PaginatedResponse<ClassModel>>('/classes', { params });
    return response.data;
  },

  /**
   * Get a single class by ID
   */
  getById: async (id: number): Promise<ClassModel> => {
    const response = await apiClient.get<{ class: ClassModel }>(`/classes/${id}`);
    return response.data.class;
  },

  /**
   * Get students enrolled in a class
   */
  getStudents: async (classId: number): Promise<ClassStudent[]> => {
    const response = await apiClient.get<{ students: ClassStudent[] }>(`/classes/${classId}/students`);
    return response.data.students;
  },

  /**
   * Create a new class (teacher/admin)
   */
  create: async (data: Partial<ClassModel>): Promise<ClassModel> => {
    const response = await apiClient.post<{ message: string; class: ClassModel }>('/classes', data);
    return response.data.class;
  },

  /**
   * Update a class (teacher/admin)
   */
  update: async (id: number, data: Partial<ClassModel>): Promise<ClassModel> => {
    const response = await apiClient.put<{ message: string; class: ClassModel }>(`/classes/${id}`, data);
    return response.data.class;
  },

  /**
   * Delete a class (teacher/admin)
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/classes/${id}`);
  },

  /**
   * Generate all sessions for a class based on program schedule
   */
  generateSessions: async (id: number): Promise<{ message: string; sessions: Session[] }> => {
    const response = await apiClient.post<{ message: string; sessions: Session[] }>(`/classes/${id}/generate-sessions`);
    return response.data;
  },

  /**
   * Regenerate all sessions for a class (delete upcoming ones and recreate)
   */
  regenerateSessions: async (id: number): Promise<{ message: string; sessions: Session[] }> => {
    const response = await apiClient.post<{ message: string; sessions: Session[] }>(`/classes/${id}/regenerate-sessions`);
    return response.data;
  },
};

export default classesApi;
