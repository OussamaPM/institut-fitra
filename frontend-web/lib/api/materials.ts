import apiClient from './client';
import { SessionMaterial, PaginatedResponse } from '@/lib/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
// Remove /api suffix for storage URLs
const STORAGE_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

export const materialsApi = {
  /**
   * Get all materials (admin/teacher)
   */
  getAll: async (params?: {
    page?: number;
    per_page?: number;
  }): Promise<PaginatedResponse<SessionMaterial>> => {
    const response = await apiClient.get<{ materials: PaginatedResponse<SessionMaterial> }>('/materials', {
      params,
    });
    return response.data.materials;
  },

  /**
   * Get materials for a specific session
   */
  getBySession: async (sessionId: number): Promise<SessionMaterial[]> => {
    const response = await apiClient.get<{ materials: SessionMaterial[] }>(`/sessions/${sessionId}/materials`);
    return response.data.materials;
  },

  /**
   * Get all materials for a student (their enrolled classes only)
   */
  getStudentMaterials: async (): Promise<SessionMaterial[]> => {
    const response = await apiClient.get<{ materials: SessionMaterial[] }>('/student/materials');
    return response.data.materials;
  },

  /**
   * Upload a file to a session
   */
  upload: async (sessionId: number, title: string, file: File): Promise<SessionMaterial> => {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('file', file);

    const response = await apiClient.post<{ material: SessionMaterial }>(
      `/sessions/${sessionId}/materials`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.material;
  },

  /**
   * Delete a material
   */
  delete: async (materialId: number): Promise<void> => {
    await apiClient.delete(`/materials/${materialId}`);
  },

  /**
   * Get download URL for a material (authenticated)
   */
  getDownloadUrl: (materialId: number): string => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '';
    return `${STORAGE_BASE_URL}/api/materials/${materialId}/download?token=${token}`;
  },

  /**
   * Get file URL for viewing (images, PDFs)
   */
  getFileUrl: (filePath: string): string => {
    return `${STORAGE_BASE_URL}/storage/${filePath}`;
  },

  /**
   * Format file size for display
   */
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
};

export default materialsApi;
