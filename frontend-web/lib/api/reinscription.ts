import apiClient from './client';
import { AvailableReinscription } from '@/lib/types';

export interface LevelsHistory {
  [programId: string]: {
    order_id: number;
    program: {
      id: number;
      name: string;
    };
    level_number: number;
    level?: {
      id: number;
      name: string;
    };
    class?: {
      id: number;
      name: string;
      academic_year: string;
    };
    amount: number;
    paid_at: string;
  }[];
}

export interface CheckoutReinscriptionData {
  program_level_id: number;
  installments_count: number;
  class_id?: number;
}

export interface CheckoutReinscriptionResponse {
  checkout_url: string;
  session_id: string;
  order_id: number;
}

export const reinscriptionApi = {
  /**
   * Get available reinscriptions for the current student
   * Returns levels that the student can enroll to (next level for each program)
   */
  getAvailable: async (): Promise<AvailableReinscription[]> => {
    const response = await apiClient.get<{ reinscriptions: AvailableReinscription[] }>(
      '/student/reinscriptions'
    );
    return response.data.reinscriptions;
  },

  /**
   * Get student's levels history (all paid levels grouped by program)
   */
  getHistory: async (): Promise<LevelsHistory> => {
    const response = await apiClient.get<{ history: LevelsHistory }>('/student/levels-history');
    return response.data.history;
  },

  /**
   * Get a specific student's levels history (admin only)
   */
  getStudentHistory: async (studentId: number): Promise<LevelsHistory> => {
    const response = await apiClient.get<{ history: LevelsHistory }>(
      `/admin/students/${studentId}/levels-history`
    );
    return response.data.history;
  },

  /**
   * Create a checkout session for reinscription
   * The student must be authenticated
   */
  createCheckoutSession: async (data: CheckoutReinscriptionData): Promise<CheckoutReinscriptionResponse> => {
    const response = await apiClient.post<CheckoutReinscriptionResponse>(
      '/checkout/reinscription',
      data
    );
    return response.data;
  },
};

export default reinscriptionApi;
