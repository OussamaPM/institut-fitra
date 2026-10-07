'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Quiz, QuizQuestion, QuizSubmission } from '@/lib/types';
import quizzesApi from '@/lib/api/quizzes';
import { Card, UserAvatar } from '@/components/ui';
import { formatParis } from '@/lib/datetime';
import {
  ArrowLeft,
  Loader2,
  HelpCircle,
  BookOpen,
  Users,
  Trophy,
  ListChecks,
  CheckCircle,
  XCircle,
  MinusCircle,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const percentOf = (correct: number, total: number): number | null =>
  total > 0 ? Math.round((correct / total) * 100) : null;

const scoreTextClass = (p: number) => (p >= 60 ? 'text-green-600' : 'text-red-600');
const scoreBarClass = (p: number) => (p >= 60 ? 'bg-green-500' : 'bg-red-500');

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

/** Détail des réponses d'un élève, question par question */
function SubmissionDetail({ questions, submission }: { questions: QuizQuestion[]; submission: QuizSubmission }) {
  const answerFor = (questionId: number) => submission.answers?.find((a) => a.question_id === questionId);

  return (
    <div className="space-y-3 px-4 pb-4 pt-1 border-t border-gray-100 bg-gray-50/60">
      {questions.map((question, index) => {
        const answer = answerFor(question.id);
        const isFreeText = question.type === 'free_text';
        // Un QCM sans option choisie est « non répondu » : ni juste ni faux à l'écran
        // (mais il compte comme une erreur dans le score, voir QuizSubmission::score).
        const isAnswered = answer?.selected_option_id != null;
        const isCorrect = answer?.is_correct === true;

        let borderClass = 'border-gray-200';
        if (!isFreeText && isAnswered) borderClass = isCorrect ? 'border-green-200' : 'border-red-200';

        return (
          <div key={question.id} className={`bg-white rounded-lg border p-4 ${borderClass}`}>
            <div className="flex items-start gap-3 mb-3">
              <span className="text-xs font-semibold text-gray-400 bg-gray-100 rounded px-1.5 py-0.5 flex-shrink-0">
                Q{index + 1}
              </span>
              <p className="flex-1 text-sm font-medium text-secondary">{question.question_text}</p>
              {isFreeText ? (
                <MessageSquare size={18} className="text-gray-400 flex-shrink-0" />
              ) : !isAnswered ? (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                  <MinusCircle size={18} className="text-gray-400" />
                  Non répondu
                </span>
              ) : isCorrect ? (
                <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
              ) : (
                <XCircle size={18} className="text-red-500 flex-shrink-0" />
              )}
            </div>

            {question.type === 'multiple_choice' ? (
              <div className="space-y-1.5 ml-8">
                {question.options?.map((option) => {
                  const wasSelected = answer?.selected_option_id === option.id;
                  const isCorrectOption = option.is_correct === true;

                  let optionClass = 'border-gray-200 text-gray-600 bg-gray-50';
                  if (isCorrectOption) optionClass = 'border-green-300 text-green-800 bg-green-50';
                  if (wasSelected && !isCorrectOption) optionClass = 'border-red-300 text-red-700 bg-red-50';

                  return (
                    <div key={option.id} className={`flex items-center gap-3 px-3 py-1.5 rounded-lg border text-sm ${optionClass}`}>
                      {isCorrectOption ? (
                        <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                      ) : wasSelected ? (
                        <XCircle size={14} className="text-red-500 flex-shrink-0" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                      )}
                      <span>{option.option_text}</span>
                      {wasSelected && <span className="ml-auto text-xs font-medium">Réponse de l&apos;élève</span>}
                      {isCorrectOption && !wasSelected && (
                        <span className="ml-auto text-xs font-medium text-green-700">Bonne réponse</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="ml-8 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-400 mb-1">Réponse de l&apos;élève :</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {answer?.free_text_answer || <span className="italic text-gray-400">Aucune réponse</span>}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function QuizResultsPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = Number(params.id);

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loadResults = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await quizzesApi.getResults(quizId);
      setQuiz(data.quiz);
      setSubmissions(data.submissions ?? []);
    } catch (err: unknown) {
      console.error('Failed to load quiz results:', err);
      setError('Impossible de charger les résultats de ce quiz.');
    } finally {
      setIsLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    if (Number.isNaN(quizId)) {
      setError('Quiz introuvable.');
      setIsLoading(false);
      return;
    }
    loadResults();
  }, [loadResults, quizId]);

  const goBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/admin/sessions');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="p-6">
        <button onClick={goBack} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
          <ArrowLeft size={16} />
          Retour
        </button>
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          {error || 'Quiz introuvable.'}
        </div>
      </div>
    );
  }

  const questions = quiz.questions ?? [];
  const mcqQuestions = questions.filter((q) => q.type === 'multiple_choice');
  const freeTextCount = questions.length - mcqQuestions.length;
  const hasMcq = mcqQuestions.length > 0;

  // Moyenne pondérée : toutes les bonnes réponses sur tous les QCM posés
  // (évite le double arrondi d'une moyenne de pourcentages).
  const totals = submissions.reduce(
    (acc, s) => ({ correct: acc.correct + (s.score?.correct ?? 0), total: acc.total + (s.score?.total ?? 0) }),
    { correct: 0, total: 0 }
  );
  const averagePercent = percentOf(totals.correct, totals.total);

  const successByQuestion = mcqQuestions.map((question) => {
    const correctCount = submissions.filter((s) =>
      s.answers?.some((a) => a.question_id === question.id && a.is_correct === true)
    ).length;
    return { question, correctCount, rate: percentOf(correctCount, submissions.length) };
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Retour */}
      <button onClick={goBack} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
        <ArrowLeft size={16} />
        Retour
      </button>

      {/* En-tête */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <HelpCircle size={22} className="text-primary" />
          <h1 className="text-2xl font-playfair font-semibold text-secondary">{quiz.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500">
          {quiz.session && (
            <span className="inline-flex items-center gap-1.5">
              <BookOpen size={14} />
              {quiz.session.title}
              {quiz.session.scheduled_at && <span>· {formatParis(quiz.session.scheduled_at, 'dd/MM/yyyy')}</span>}
            </span>
          )}
          {quiz.class && (
            <span className="inline-flex items-center gap-1.5">
              <Users size={14} />
              {quiz.class.name}
              {quiz.class.program?.name && <span className="text-gray-400">({quiz.class.program.name})</span>}
            </span>
          )}
        </div>
        {quiz.description && <p className="text-sm text-gray-500 mt-2">{quiz.description}</p>}
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 rounded-full">
              <Users size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Soumissions</p>
              <p className="text-2xl font-bold text-secondary">{submissions.length}</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 rounded-full">
              <Trophy size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Score moyen (QCM)</p>
              <p className={`text-2xl font-bold ${averagePercent === null ? 'text-gray-400' : scoreTextClass(averagePercent)}`}>
                {averagePercent === null ? '—' : `${averagePercent}%`}
              </p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-full">
              <ListChecks size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Questions</p>
              <p className="text-2xl font-bold text-secondary">{questions.length}</p>
              <p className="text-xs text-gray-400">
                {mcqQuestions.length} QCM · {plural(freeTextCount, 'libre')}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Réussite par question */}
      {successByQuestion.length > 0 && submissions.length > 0 && (
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-secondary mb-4">Réussite par question</h2>
          <div className="space-y-3">
            {successByQuestion.map(({ question, correctCount, rate }) => (
              <div key={question.id}>
                <div className="flex items-start justify-between gap-3 mb-1">
                  <p className="text-sm text-gray-700">
                    <span className="text-xs font-semibold text-gray-400 bg-gray-100 rounded px-1.5 py-0.5 mr-2">
                      Q{questions.indexOf(question) + 1}
                    </span>
                    {question.question_text}
                  </p>
                  <span className={`text-sm font-semibold whitespace-nowrap ${rate === null ? 'text-gray-400' : scoreTextClass(rate)}`}>
                    {correctCount}/{submissions.length}
                    {rate !== null && <span className="text-xs font-normal text-gray-400 ml-1">({rate}%)</span>}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${rate !== null ? scoreBarClass(rate) : 'bg-gray-300'}`} style={{ width: `${rate ?? 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Soumissions */}
      <Card padding="none">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-secondary">
            Soumissions{' '}
            <span className="text-sm font-normal text-gray-400">({submissions.length})</span>
          </h2>
        </div>

        {submissions.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-10">Aucune soumission pour le moment.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {submissions.map((submission) => {
              const student = submission.student;
              const profile = student?.student_profile;
              const score = submission.score;
              const pct = hasMcq && score ? percentOf(score.correct, score.total) : null;
              const isExpanded = expandedId === submission.id;

              return (
                <li key={submission.id}>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : submission.id)}
                    className="w-full flex items-center gap-4 px-6 py-3 text-left hover:bg-gray-50 transition-colors"
                    aria-expanded={isExpanded}
                  >
                    <UserAvatar
                      firstName={student?.first_name ?? ''}
                      lastName={student?.last_name ?? ''}
                      gender={profile?.gender}
                      profilePhoto={profile?.profile_photo_url ?? profile?.profile_photo}
                      size="md"
                      role="student"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-secondary truncate">
                        {student ? `${student.first_name} ${student.last_name}` : 'Élève inconnu'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {student?.email}
                        {submission.submitted_at && (
                          <span> · Soumis le {formatParis(submission.submitted_at, "dd MMM yyyy 'à' HH:mm")}</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {!hasMcq ? (
                        <p className="text-xs text-gray-400">Réponses libres</p>
                      ) : score && pct !== null ? (
                        <>
                          <p className={`text-lg font-bold ${scoreTextClass(pct)}`}>{pct}%</p>
                          <p className="text-xs text-gray-400">
                            {plural(score.correct, 'bonne réponse')} sur {score.total}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-gray-400">—</p>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={18} className="text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown size={18} className="text-gray-400 flex-shrink-0" />
                    )}
                  </button>

                  {isExpanded && <SubmissionDetail questions={questions} submission={submission} />}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
