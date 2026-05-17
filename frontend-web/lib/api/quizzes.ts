import apiClient from './client';
import { Quiz, QuizSubmission, CreateQuizData, SubmitQuizData, QuizScore } from '@/lib/types';

const quizzesApi = {
  // ── Admin ──────────────────────────────────────────────────────────────────

  getForSession: async (sessionId: number, classId: number): Promise<Quiz | null> => {
    const response = await apiClient.get('/admin/quizzes', {
      params: { session_id: sessionId, class_id: classId },
    });
    return response.data.quiz;
  },

  create: async (data: CreateQuizData): Promise<Quiz> => {
    const response = await apiClient.post('/admin/quizzes', data);
    return response.data.quiz;
  },

  update: async (id: number, data: Partial<CreateQuizData>): Promise<Quiz> => {
    const response = await apiClient.put(`/admin/quizzes/${id}`, data);
    return response.data.quiz;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/admin/quizzes/${id}`);
  },

  getResults: async (id: number): Promise<{
    quiz: Quiz;
    submissions: QuizSubmission[];
    submissions_count: number;
  }> => {
    const response = await apiClient.get(`/admin/quizzes/${id}/results`);
    return response.data;
  },

  // ── Student ────────────────────────────────────────────────────────────────

  getStudentQuizzes: async (): Promise<Quiz[]> => {
    const response = await apiClient.get('/student/quizzes');
    return response.data.quizzes;
  },

  getStudentQuiz: async (id: number): Promise<{
    quiz: Quiz;
    submitted: boolean;
    submitted_at?: string;
  }> => {
    const response = await apiClient.get(`/student/quizzes/${id}`);
    return response.data;
  },

  submit: async (id: number, data: SubmitQuizData): Promise<{
    submission_id: number;
    score: QuizScore;
  }> => {
    const response = await apiClient.post(`/student/quizzes/${id}/submit`, data);
    return response.data;
  },

  review: async (id: number): Promise<{
    quiz: Quiz;
    submission: QuizSubmission;
    score: QuizScore;
  }> => {
    const response = await apiClient.get(`/student/quizzes/${id}/review`);
    return response.data;
  },
};

export default quizzesApi;
