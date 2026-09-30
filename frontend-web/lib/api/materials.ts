import apiClient from './client';
import { SessionMaterial, PaginatedResponse } from '@/lib/types';

/** 40 Mo, aligné sur SessionMaterialController::MAX_FILE_BYTES. */
export const MAX_MATERIAL_BYTES = 40 * 1024 * 1024;

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
   * URL signée d'un support.
   *
   * Le fichier est sur Spaces : il n'existe pas sous /storage sur le domaine de
   * l'API, et un <a href> n'enverrait pas l'en-tête Authorization. On demande
   * donc le lien à l'API — qui vérifie l'inscription et le niveau — puis on
   * navigue dessus. Le lien expire au bout de 5 minutes.
   */
  getDownloadUrl: async (materialId: number): Promise<string> => {
    const response = await apiClient.get<{ url: string }>(`/materials/${materialId}/download`);
    return response.data.url;
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
