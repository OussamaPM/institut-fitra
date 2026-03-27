import apiClient from './client';
import { LoginCredentials, RegisterData, AuthResponse, User } from '@/lib/types';

export const authApi = {
  /**
   * Login user with email and password
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  /**
   * Register a new user
   */
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  /**
   * Logout current user
   */
  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  /**
   * Get current authenticated user
   */
  me: async (): Promise<User> => {
    const response = await apiClient.get<{ user: User }>('/auth/me');
    return response.data.user;
  },

  /**
   * Update user profile
   */
  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await apiClient.put<{ user: User }>('/auth/profile', data);
    return response.data.user;
  },
};

export default authApi;
