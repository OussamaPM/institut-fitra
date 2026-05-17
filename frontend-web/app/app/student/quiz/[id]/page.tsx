'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Quiz, QuizQuestion, SubmitQuizData } from '@/lib/types';
import quizzesApi from '@/lib/api/quizzes';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  BookOpen,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

export default function StudentQuizPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = Number(params.id);

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, { selected_option_id?: number; free_text_answer?: string }>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadQuiz();
  }, [quizId]);

  const loadQuiz = async () => {
    try {
      setLoading(true);
      const data = await quizzesApi.getStudentQuiz(quizId);
      if (data.submitted) {
        router.replace(`/app/student/quiz/${quizId}/review`);
        return;
      }
      setQuiz(data.quiz);
    } catch {
      router.replace('/app/student/supports');
    } finally {
      setLoading(false);
    }
  };

  const questions = quiz?.questions ?? [];
  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;

  const setMcqAnswer = (questionId: number, optionId: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: { selected_option_id: optionId } }));
  };

  const setFreeAnswer = (questionId: number, text: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: { free_text_answer: text } }));
  };

  const getCurrentAnswer = (question: QuizQuestion) => answers[question.id];

  const handleSubmit = async () => {
    if (!quiz) return;
    try {
      setSubmitting(true);
      const payload: SubmitQuizData = {
        answers: questions.map((q) => ({
          question_id: q.id,
          selected_option_id: answers[q.id]?.selected_option_id,
          free_text_answer: answers[q.id]?.free_text_answer,
        })),
      };
      await quizzesApi.submit(quizId, payload);
      router.replace(`/app/student/quiz/${quizId}/review`);
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Erreur lors de la soumission.');
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!quiz || totalQuestions === 0) {
    return (
      <div className="p-8 text-center text-gray-500">Quiz introuvable.</div>
    );
  }

  const progress = Math.round(((currentIndex + 1) / totalQuestions) * 100);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <HelpCircle size={20} className="text-primary" />
            <h1 className="text-xl md:text-2xl font-playfair font-semibold text-secondary">{quiz.title}</h1>
          </div>
          {quiz.session && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <BookOpen size={14} />
              <span>{quiz.session.title}</span>
            </div>
          )}
          {quiz.description && (
            <p className="text-sm text-gray-600 mt-2">{quiz.description}</p>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Question {currentIndex + 1} sur {totalQuestions}</span>
            <span>{answeredCount}/{totalQuestions} répondue{answeredCount > 1 ? 's' : ''}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <p className="text-sm text-gray-400 mb-3">
            {currentQuestion.type === 'multiple_choice' ? 'Choix multiple' : 'Réponse libre'}
          </p>
          <p className="text-lg font-medium text-secondary mb-6">{currentQuestion.question_text}</p>

          {currentQuestion.type === 'multiple_choice' ? (
            <div className="space-y-3">
              {currentQuestion.options?.map((option) => {
                const isSelected = getCurrentAnswer(currentQuestion)?.selected_option_id === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => setMcqAnswer(currentQuestion.id, option.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 text-secondary font-medium'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all ${
                        isSelected ? 'border-primary bg-primary' : 'border-gray-300'
                      }`}>
                        {isSelected && <div className="w-full h-full rounded-full bg-white scale-50" />}
                      </div>
                      <span>{option.option_text}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <textarea
              value={getCurrentAnswer(currentQuestion)?.free_text_answer ?? ''}
              onChange={(e) => setFreeAnswer(currentQuestion.id, e.target.value)}
              placeholder="Votre réponse..."
              rows={5}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
            Précédent
          </button>

          {/* Question dots */}
          <div className="hidden md:flex gap-1.5">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  i === currentIndex
                    ? 'bg-primary scale-125'
                    : answers[questions[i].id]
                    ? 'bg-primary/40'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          {currentIndex < totalQuestions - 1 ? (
            <button
              onClick={() => setCurrentIndex((i) => Math.min(totalQuestions - 1, i + 1))}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition-colors"
            >
              Suivant
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              <CheckCircle size={16} />
              Terminer
            </button>
          )}
        </div>
      </div>

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-amber-100 rounded-full">
                <AlertTriangle size={20} className="text-amber-600" />
              </div>
              <h2 className="text-lg font-semibold text-secondary">Soumettre le quiz ?</h2>
            </div>
            <p className="text-gray-600 text-sm mb-2">
              Vous avez répondu à <strong>{answeredCount}</strong> question{answeredCount > 1 ? 's' : ''} sur <strong>{totalQuestions}</strong>.
            </p>
            <p className="text-amber-700 text-sm font-medium bg-amber-50 rounded-lg px-3 py-2 mb-6">
              Attention : une fois soumis, vous ne pourrez plus modifier vos réponses.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60 transition-colors"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                {submitting ? 'Soumission...' : 'Confirmer et soumettre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
