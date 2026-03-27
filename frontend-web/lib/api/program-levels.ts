import apiClient from './client';
import { ProgramLevel, Program, ProgramSchedule } from '@/lib/types';

export interface CreateLevelData {
  name: string;
  description?: string;
  price: number;
  max_installments: number;
  schedule?: ProgramSchedule[];
  teacher_id?: number;
}

export interface UpdateLevelData extends CreateLevelData {}

export interface ActivateLevelData {
  class_ids: number[];
  confirmed?: boolean;
}

export interface ActivateLevelResponse {
  requires_confirmation?: boolean;
  eligible_students_count?: number;
  message: string;
  level?: ProgramLevel;
  emails_sent?: number;
}

export interface DeactivateLevelData {
  class_id?: number; // undefined = désactiver toutes les classes
}

export interface DeactivateLevelResponse {
  message: string;
  level?: ProgramLevel;
}

export const programLevelsApi = {
  /**
   * Get all levels for a program
   */
  getByProgram: async (programId: number): Promise<{ levels: ProgramLevel[]; program: Program }> => {
    const response = await apiClient.get<{ levels: ProgramLevel[]; program: Program }>(
      `/programs/${programId}/levels`
    );
    return response.data;
  },

  /**
   * Get a single level
   */
  getById: async (programId: number, levelId: number): Promise<ProgramLevel> => {
    const response = await apiClient.get<{ level: ProgramLevel }>(
      `/programs/${programId}/levels/${levelId}`
    );
    return response.data.level;
  },

  /**
   * Create a new level for a program
   * The level_number is calculated automatically by the backend
   */
  create: async (programId: number, data: CreateLevelData): Promise<ProgramLevel> => {
    const response = await apiClient.post<{ level: ProgramLevel; message: string }>(
      `/programs/${programId}/levels`,
      data
    );
    return response.data.level;
  },

  /**
   * Update a level
   */
  update: async (programId: number, levelId: number, data: UpdateLevelData): Promise<ProgramLevel> => {
    const response = await apiClient.put<{ level: ProgramLevel; message: string }>(
      `/programs/${programId}/levels/${levelId}`,
      data
    );
    return response.data.level;
  },

  /**
   * Delete a level (only if no enrollments)
   */
  delete: async (programId: number, levelId: number): Promise<void> => {
    await apiClient.delete(`/programs/${programId}/levels/${levelId}`);
  },

  /**
   * Activate a level for one or more classes
   * If students need to be notified, returns requires_confirmation: true
   * Call again with confirmed: true to confirm and send emails
   */
  activate: async (
    programId: number,
    levelId: number,
    data: ActivateLevelData
  ): Promise<ActivateLevelResponse> => {
    const response = await apiClient.post<ActivateLevelResponse>(
      `/programs/${programId}/levels/${levelId}/activate`,
      data
    );
    return response.data;
  },

  /**
   * Deactivate a level
   * If class_id provided, only removes that class activation
   * Otherwise removes all activations for this level
   */
  deactivate: async (
    programId: number,
    levelId: number,
    data?: DeactivateLevelData
  ): Promise<DeactivateLevelResponse> => {
    const response = await apiClient.post<DeactivateLevelResponse>(
      `/programs/${programId}/levels/${levelId}/deactivate`,
      data ?? {}
    );
    return response.data;
  },
};

export default programLevelsApi;
