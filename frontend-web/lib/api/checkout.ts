import axios from 'axios';

const publicApiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

interface CheckoutData {
  program_id: number;
  customer_email: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_phone?: string;
  customer_gender: 'male' | 'female';
  installments_count?: number;
}

interface CheckoutSession {
  checkout_url: string;
  session_id: string;
  order_id: number;
}

interface CheckoutStatus {
  order?: {
    id: number;
    status: string;
    payment_method: string;
  };
  session?: {
    status: string;
    payment_status: string;
  };
  session_status?: string;
  payment_status?: string;
}

const checkoutApi = {
  // Create checkout session
  createSession: async (data: CheckoutData): Promise<CheckoutSession> => {
    const response = await publicApiClient.post('/checkout/create-session', data);
    return response.data;
  },

  // Get checkout status
  getStatus: async (sessionId: string): Promise<CheckoutStatus> => {
    const response = await publicApiClient.get(`/checkout/status?session_id=${sessionId}`);
    return response.data;
  },
};

export default checkoutApi;
