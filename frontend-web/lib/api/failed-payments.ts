import apiClient from './client';
import { OrderPaymentHistory } from '@/lib/types';

export interface FailedPayment {
  id: number;
  order_id: number;
  program_name: string;
  level_name?: string;
  amount: number;
  installment_number: number;
  installments_count: number;
  error_message?: string;
  last_attempt_at?: string;
  created_at: string;
}

interface RecoverySession {
  checkout_url: string;
  session_id: string;
}

const failedPaymentsApi = {
  // Get student's failed payments (non recovered)
  getAll: async (): Promise<{ failed_payments: FailedPayment[] }> => {
    const response = await apiClient.get('/student/failed-payments');
    return response.data;
  },

  // Get student's payment history (including recovered payments)
  getPaymentHistory: async (): Promise<{ payment_history: OrderPaymentHistory[] }> => {
    const response = await apiClient.get('/student/payment-history');
    return response.data;
  },

  // Create recovery checkout session for a failed payment
  createRecoverySession: async (paymentId: number): Promise<RecoverySession> => {
    const response = await apiClient.post('/checkout/recovery', { payment_id: paymentId });
    return response.data;
  },
};

export default failedPaymentsApi;
