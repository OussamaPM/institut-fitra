import apiClient from './client';
import {
  TrackingForm,
  TrackingFormAssignment,
  CreateTrackingFormData,
  AssignFormData,
  SubmitFormResponseData,
  User,
  PaginatedResponse,
} from '@/lib/types';

// Admin API
export const trackingFormsApi = {
  // Get all forms (admin)
  getAll: async (params?: {
    page?: number;
    per_page?: number;
    is_active?: boolean;
  }): Promise<PaginatedResponse<TrackingForm>> => {
    const response = await apiClient.get('/admin/tracking-forms', { params });
    return response.data.forms;
  },

  // Get single form with details
  getById: async (id: number): Promise<TrackingForm> => {
    const response = await apiClient.get(`/admin/tracking-forms/${id}`);
    return response.data.form;
  },

  // Create new form
  create: async (data: CreateTrackingFormData): Promise<TrackingForm> => {
    const response = await apiClient.post('/admin/tracking-forms', data);
    return response.data.form;
  },

  // Update form
  update: async (
    id: number,
    data: Partial<CreateTrackingFormData>
  ): Promise<TrackingForm> => {
    const response = await apiClient.put(`/admin/tracking-forms/${id}`, data);
    return response.data.form;
  },

  // Delete form
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/admin/tracking-forms/${id}`);
  },

  // Toggle active status
  toggleActive: async (id: number): Promise<TrackingForm> => {
    const response = await apiClient.post(
      `/admin/tracking-forms/${id}/toggle-active`
    );
    return response.data.form;
  },

  // Assign form to students
  assign: async (
    id: number,
    data: AssignFormData
  ): Promise<{ message: string; assigned_count: number; already_assigned_count: number }> => {
    const response = await apiClient.post(
      `/admin/tracking-forms/${id}/assign`,
      data
    );
    return response.data;
  },

  // Get assignments for a form
  getAssignments: async (id: number): Promise<TrackingFormAssignment[]> => {
    const response = await apiClient.get(
      `/admin/tracking-forms/${id}/assignments`
    );
    return response.data.assignments;
  },

  // Get student responses for a form
  getStudentResponses: async (
    formId: number,
    studentId: number
  ): Promise<{ form: TrackingForm; assignment: TrackingFormAssignment }> => {
    const response = await apiClient.get(
      `/admin/tracking-forms/${formId}/students/${studentId}`
    );
    return response.data;
  },

  // Get available students for assignment
  getAvailableStudents: async (params?: {
    class_id?: number;
    search?: string;
  }): Promise<User[]> => {
    const response = await apiClient.get('/admin/tracking-forms/students', {
      params,
    });
    return response.data.students;
  },

  // Get student tracking history (for admin - student profile)
  getStudentTracking: async (
    studentId: number
  ): Promise<TrackingFormAssignment[]> => {
    const response = await apiClient.get(
      `/admin/students/${studentId}/tracking`
    );
    return response.data.assignments;
  },
};

// Student API
export const studentTrackingApi = {
  // Get assigned forms
  getMyForms: async (): Promise<TrackingFormAssignment[]> => {
    const response = await apiClient.get('/student/tracking');
    return response.data.assignments;
  },

  // Get form to complete
  getForm: async (
    formId: number
  ): Promise<{ form: TrackingForm; assignment: TrackingFormAssignment }> => {
    const response = await apiClient.get(`/student/tracking/${formId}`);
    return response.data;
  },

  // Submit responses
  submit: async (
    formId: number,
    data: SubmitFormResponseData
  ): Promise<{ message: string; assignment: TrackingFormAssignment }> => {
    const response = await apiClient.post(
      `/student/tracking/${formId}/submit`,
      data
    );
    return response.data;
  },

  // Get completed forms history
  getHistory: async (): Promise<TrackingFormAssignment[]> => {
    const response = await apiClient.get('/student/tracking/history');
    return response.data.assignments;
  },

  // Get pending forms count (for sidebar badge)
  getPendingCount: async (): Promise<number> => {
    const response = await apiClient.get('/student/tracking/pending-count');
    return response.data.pending_count;
  },
};

export default trackingFormsApi;
