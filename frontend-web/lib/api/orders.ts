import apiClient from './client';
import { Order, OrderStats, OrderStatus, PaymentMethod } from '../types';

interface OrderFilters {
  status?: OrderStatus;
  payment_method?: PaymentMethod;
  program_id?: number;
  search?: string;
  per_page?: number;
  page?: number;
}

interface ManualOrderData {
  program_id: number;
  class_id?: number;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone?: string;
  customer_gender: 'male' | 'female';
  payment_method: 'free' | 'cash' | 'transfer';
  custom_amount?: number;
  admin_notes?: string;
}

interface UpdateOrderData {
  status?: OrderStatus;
  notes?: string;
  class_id?: number;
}

const ordersApi = {
  // Get all orders (admin)
  getAll: async (filters?: OrderFilters): Promise<{ orders: Order[]; pagination: any }> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.payment_method) params.append('payment_method', filters.payment_method);
    if (filters?.program_id) params.append('program_id', filters.program_id.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.per_page) params.append('per_page', filters.per_page.toString());
    if (filters?.page) params.append('page', filters.page.toString());

    const response = await apiClient.get(`/admin/orders?${params.toString()}`);
    return {
      orders: response.data.orders.data,
      pagination: {
        current_page: response.data.orders.current_page,
        last_page: response.data.orders.last_page,
        per_page: response.data.orders.per_page,
        total: response.data.orders.total,
      },
    };
  },

  // Get order by ID
  getById: async (id: number): Promise<Order> => {
    const response = await apiClient.get(`/admin/orders/${id}`);
    return response.data.order;
  },

  // Create manual order (free)
  createManual: async (data: ManualOrderData): Promise<Order> => {
    const response = await apiClient.post('/admin/orders/manual', data);
    return response.data.order;
  },

  // Update order
  update: async (id: number, data: UpdateOrderData): Promise<Order> => {
    const response = await apiClient.put(`/admin/orders/${id}`, data);
    return response.data.order;
  },

  // Delete order
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/admin/orders/${id}`);
  },

  // Get statistics
  getStats: async (): Promise<OrderStats> => {
    const response = await apiClient.get('/admin/orders/stats');
    return response.data;
  },
};

export default ordersApi;
