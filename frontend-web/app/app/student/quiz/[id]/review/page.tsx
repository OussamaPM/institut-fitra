'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Quiz, QuizSubmission, QuizScore } from '@/lib/types';
import quizzesApi from '@/lib/api/quizzes';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatParis } from '@/lib/datetime';
import {
  Loader2,
  CheckCircle,
  XCircle,
  HelpCircle,
  BookOpen,
  ArrowLeft,
  Trophy,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';

export default function QuizReviewPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = Number(params.id);

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [submission, setSubmission] = useState<QuizSubmission | null>(null);
  const [score, setScore] = useState<QuizScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReview();
  }, [quizId]);

  const loadReview = async () => {
    try {
      setLoading(true);
      const data = await quizzesApi.review(quizId);
      setQuiz(data.quiz);
      setSubmission(data.submission);
      setScore(data.score);
    } catch {
      router.replace('/app/student/supports');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!quiz || !submission || !score) {
    return <div className="p-8 text-center text-gray-500">Résultats introuvables.</div>;
  }

  const getAnswerForQuestion = (questionId: number) =>
    submission.answers?.find((a) => a.question_id === questionId);

  const scorePercent = score.total > 0 ? Math.round((score.correct / score.total) * 100) : null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Back link */}
        <Link
          href="/app/student/supports"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Retour aux supports
        </Link>

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
              {quiz.session.scheduled_at && (
                <span>· {formatParis(quiz.session.scheduled_at, 'dd/MM/yyyy')}</span>
              )}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-1">
            Soumis le {format(new Date(submission.submitted_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
          </p>
        </div>

        {/* Score Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-amber-100 rounded-full">
              <Trophy size={20} className="text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold text-secondary">Résultat</h2>
          </div>

          {score.total > 0 ? (
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Circular score */}
              <div className="relative w-28 h-28 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-28 h-28 -rotate-90">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={scorePercent! >= 60 ? '#16a34a' : '#dc2626'}
                    strokeWidth="3"
                    strokeDasharray={`${scorePercent}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-2xl font-bold ${scorePercent! >= 60 ? 'text-green-600' : 'text-red-600'}`}>
                    {scorePercent}%
                  </span>
                </div>
              </div>

              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle size={18} className="text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-800">Bonnes réponses</p>
                    <p className="text-xl font-bold text-green-700">{score.correct} / {score.total}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                  <XCircle size={18} className="text-red-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-700">Erreurs</p>
                    <p className="text-xl font-bold text-red-600">{score.incorrect} / {score.total}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Ce quiz ne contient que des réponses libres — pas de score calculé.</p>
          )}
        </div>

        {/* Questions Review */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-secondary">Détail des réponses</h2>

          {(quiz.questions ?? []).map((question, index) => {
            const answer = getAnswerForQuestion(question.id);
            const isCorrect = answer?.is_correct;
            const isFreeText = question.type === 'free_text';

            return (
              <div
                key={question.id}
                className={`bg-white rounded-xl border p-5 ${
                  isFreeText
                    ? 'border-gray-200'
                    : isCorrect
                    ? 'border-green-200'
                    : 'border-red-200'
                }`}
              >
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-xs font-semibold text-gray-400 bg-gray-100 rounded px-1.5 py-0.5 flex-shrink-0">
                    Q{index + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-secondary">{question.question_text}</p>
                      {!isFreeText && (
                        isCorrect ? (
                          <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle size={20} className="text-red-500 flex-shrink-0" />
                        )
                      )}
                      {isFreeText && <MessageSquare size={18} className="text-gray-400 flex-shrink-0" />}
                    </div>
                  </div>
                </div>

                {question.type === 'multiple_choice' ? (
                  <div className="space-y-2 ml-8">
                    {question.options?.map((option) => {
                      const wasSelected = answer?.selected_option_id === option.id;
                      const isCorrectOption = option.is_correct;

                      let optionClass = 'border-gray-200 text-gray-600 bg-gray-50';
                      if (isCorrectOption) optionClass = 'border-green-300 text-green-800 bg-green-50';
                      if (wasSelected && !isCorrectOption) optionClass = 'border-red-300 text-red-700 bg-red-50';

                      return (
                        <div key={option.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${optionClass}`}>
                          <div className="flex-shrink-0">
                            {isCorrectOption ? (
                              <CheckCircle size={16} className="text-green-500" />
                            ) : wasSelected ? (
                              <XCircle size={16} className="text-red-500" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                            )}
                          </div>
                          <span className="text-sm">{option.option_text}</span>
                          {wasSelected && (
                            <span className="ml-auto text-xs font-medium">Votre réponse</span>
                          )}
                          {isCorrectOption && !wasSelected && (
                            <span className="ml-auto text-xs font-medium text-green-700">Bonne réponse</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="ml-8 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-400 mb-1">Votre réponse :</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {answer?.free_text_answer || <span className="italic text-gray-400">Aucune réponse</span>}
                    </p>
                  </div>
                )}

                {question.answer_explanation && (
                  <div className="ml-8 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs font-medium text-amber-700 mb-1 flex items-center gap-1.5">
                      <BookOpen size={14} />
                      Détail de la réponse
                    </p>
                    <p className="text-sm text-amber-900 whitespace-pre-wrap">{question.answer_explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8">
          <Link
            href="/app/student/supports"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <ArrowLeft size={16} />
            Retour aux supports
          </Link>
        </div>
      </div>
    </div>
  );
}
