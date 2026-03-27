import apiClient from './client';
import { User, PaginatedResponse, Gender } from '@/lib/types';

export interface CreateUserData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: 'student' | 'teacher' | 'admin';
  gender?: Gender;
  phone?: string;
  date_of_birth?: string;
  address?: string;
  city?: string;
  country?: string;
  emergency_contact?: string;
  specialization?: string;
  bio?: string;
}

export interface UpdateUserData {
  first_name?: string;
  last_name?: string;
  email?: string;
  password?: string;
  role?: 'student' | 'teacher' | 'admin';
  gender?: Gender;
  phone?: string;
  date_of_birth?: string;
  address?: string;
  city?: string;
  country?: string;
  emergency_contact?: string;
  specialization?: string;
  bio?: string;
}

export const usersApi = {
  /**
   * Get all users with pagination and filters
   */
  getAll: async (params?: {
    page?: number;
    per_page?: number;
    role?: string;
    search?: string;
  }): Promise<PaginatedResponse<User>> => {
    const response = await apiClient.get<PaginatedResponse<User>>('/admin/users', {
      params,
    });
    return response.data;
  },

  /**
   * Get a single user by ID
   */
  getById: async (id: number): Promise<User> => {
    const response = await apiClient.get<{ user: User }>(`/admin/users/${id}`);
    return response.data.user;
  },

  /**
   * Create a new user (supports FormData for file upload)
   */
  create: async (data: CreateUserData | FormData): Promise<User> => {
    const isFormData = data instanceof FormData;
    const response = await apiClient.post<{ user: User; message: string }>('/admin/users', data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });
    return response.data.user;
  },

  /**
   * Update an existing user (supports FormData for file upload)
   */
  update: async (id: number, data: UpdateUserData | FormData): Promise<User> => {
    const isFormData = data instanceof FormData;
    // For FormData with PUT, we need to use POST with _method override
    if (isFormData) {
      data.append('_method', 'PUT');
      const response = await apiClient.post<{ user: User; message: string }>(`/admin/users/${id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data.user;
    }
    const response = await apiClient.put<{ user: User; message: string }>(`/admin/users/${id}`, data);
    return response.data.user;
  },

  /**
   * Delete a user
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/admin/users/${id}`);
  },
};

export default usersApi;
