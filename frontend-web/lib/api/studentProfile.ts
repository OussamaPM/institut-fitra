import apiClient from './client';
import { User } from '@/lib/types';

export interface UpdatePhotoResponse {
  message: string;
  user: User;
  profile_photo_url: string;
}

export interface RemovePhotoResponse {
  message: string;
  user: User;
}

export interface UpdateProfileData {
  email: string;
  first_name: string;
  last_name: string;
  gender?: string;
  phone?: string;
  date_of_birth?: string;
  address?: string;
  city?: string;
  country?: string;
  emergency_contact?: string;
}

export const studentProfileApi = {
  /**
   * Update the student's profile information
   */
  update: async (data: UpdateProfileData): Promise<{ message: string; user: User }> => {
    const response = await apiClient.put('/student/profile', data);
    return response.data;
  },

  /**
   * Update the student's profile photo
   */
  updatePhoto: async (photo: File): Promise<UpdatePhotoResponse> => {
    const formData = new FormData();
    formData.append('profile_photo', photo);

    const response = await apiClient.post<UpdatePhotoResponse>(
      '/student/profile/photo',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return response.data;
  },

  /**
   * Remove the student's profile photo
   */
  removePhoto: async (): Promise<RemovePhotoResponse> => {
    const response = await apiClient.delete<RemovePhotoResponse>('/student/profile/photo');
    return response.data;
  },
};

export default studentProfileApi;
