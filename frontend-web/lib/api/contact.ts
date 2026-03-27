import apiClient from './client';

export interface ContactMessageData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

export interface ContactMessage extends ContactMessageData {
  id: number;
  status: 'new' | 'in_progress' | 'resolved';
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export const contactApi = {
  // Public endpoint - Send contact message
  send: async (data: ContactMessageData) => {
    const response = await apiClient.post('/contact', data);
    return response.data;
  },

  // Admin endpoints - Manage contact messages
  getAll: async (params?: { status?: string; unread?: boolean; search?: string }) => {
    const response = await apiClient.get('/admin/contact-messages', { params });
    return response.data.contact_messages as ContactMessage[];
  },

  getById: async (id: number) => {
    const response = await apiClient.get(`/admin/contact-messages/${id}`);
    return response.data.contact_message as ContactMessage;
  },

  updateStatus: async (id: number, status: 'new' | 'in_progress' | 'resolved') => {
    const response = await apiClient.put(`/admin/contact-messages/${id}`, { status });
    return response.data.contact_message as ContactMessage;
  },

  delete: async (id: number) => {
    const response = await apiClient.delete(`/admin/contact-messages/${id}`);
    return response.data;
  },
};
