import apiClient from './client';
import { Program, PaginatedResponse, User } from '@/lib/types';

export const programsApi = {
  /**
   * Get list of teachers (teachers + admins) for program assignment
   */
  getTeachers: async (): Promise<User[]> => {
    const response = await apiClient.get<{ teachers: User[] }>('/programs/teachers');
    return response.data.teachers;
  },

  /**
   * Get all programs (public)
   */
  getAll: async (params?: {
    page?: number;
    per_page?: number;
    level?: string;
    active?: boolean;
    search?: string;
  }): Promise<PaginatedResponse<Program>> => {
    const response = await apiClient.get<{ programs: PaginatedResponse<Program> }>('/programs', { params });
    return response.data.programs;
  },

  /**
   * Get a single program by ID
   */
  getById: async (id: number): Promise<Program> => {
    const response = await apiClient.get<{ program: Program }>(`/programs/${id}`);
    return response.data.program;
  },

  /**
   * Create a new program (teacher/admin)
   */
  create: async (data: Partial<Program>): Promise<Program> => {
    const response = await apiClient.post<{ program: Program }>('/programs', data);
    return response.data.program;
  },

  /**
   * Update a program (teacher/admin)
   */
  update: async (id: number, data: Partial<Program>): Promise<Program> => {
    const response = await apiClient.put<{ program: Program }>(`/programs/${id}`, data);
    return response.data.program;
  },

  /**
   * Delete a program (teacher/admin)
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/programs/${id}`);
  },
};

export default programsApi;
