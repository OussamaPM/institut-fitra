'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Quiz, QuizQuestionType } from '@/lib/types';
import { Button } from '@/components/ui';
import quizzesApi from '@/lib/api/quizzes';
import {
  Edit,
  Trash2,
  X,
  Plus,
  Loader2,
  Save,
  HelpCircle,
  ChevronUp,
  ChevronDown,
  CheckCircle,
  Users,
} from 'lucide-react';

interface QuizOptionDraft {
  option_text: string;
  is_correct: boolean;
}

interface QuizQuestionDraft {
  question_text: string;
  type: QuizQuestionType;
  answer_explanation: string;
  options: QuizOptionDraft[];
}

interface SessionQuizSectionProps {
  /** Le quiz est unique par (session, classe) : la classe est celle de la session. */
  session: { id: number; class_id: number };
  /** Prévient le parent après création, modification ou suppression. */
  onChange?: (quiz: Quiz | null) => void;
  /** Ouvre directement le formulaire de création s'il n'existe pas encore de quiz. */
  startInCreateMode?: boolean;
}

/**
 * Création, modification, suppression et lien vers les résultats du quiz d'une séance.
 * Partagé entre la modale de session et la page Supports & Replays.
 */
export default function SessionQuizSection({
  session,
  onChange,
  startInCreateMode = false,
}: SessionQuizSectionProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(true);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestionDraft[]>([]);
  const [openExplanations, setOpenExplanations] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetchQuiz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id, session.class_id]);

  const fetchQuiz = async () => {
    try {
      setLoadingQuiz(true);
      const data = await quizzesApi.getForSession(session.id, session.class_id);
      setQuiz(data);
      if (!data && startInCreateMode) openQuizForm();
    } catch (error) {
      console.error('Error fetching quiz:', error);
    } finally {
      setLoadingQuiz(false);
    }
  };

  const addQuestion = () => {
    setQuizQuestions([...quizQuestions, { question_text: '', type: 'multiple_choice', answer_explanation: '', options: [{ option_text: '', is_correct: true }, { option_text: '', is_correct: false }] }]);
  };

  const removeQuestion = (index: number) => {
    setQuizQuestions(quizQuestions.filter((_, i) => i !== index));
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newQuestions = [...quizQuestions];
    const target = direction === 'up' ? index - 1 : index + 1;
    [newQuestions[index], newQuestions[target]] = [newQuestions[target], newQuestions[index]];
    setQuizQuestions(newQuestions);
  };

  const updateQuestion = (index: number, field: keyof QuizQuestionDraft, value: string) => {
    const newQuestions = [...quizQuestions];
    if (field === 'type') {
      const newType = value as QuizQuestionType;
      newQuestions[index] = {
        ...newQuestions[index],
        type: newType,
        options: newType === 'multiple_choice' ? [{ option_text: '', is_correct: true }, { option_text: '', is_correct: false }] : [],
      };
    } else {
      newQuestions[index] = { ...newQuestions[index], [field]: value };
    }
    setQuizQuestions(newQuestions);
  };

  const addOption = (questionIndex: number) => {
    const newQuestions = [...quizQuestions];
    newQuestions[questionIndex].options.push({ option_text: '', is_correct: false });
    setQuizQuestions(newQuestions);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const newQuestions = [...quizQuestions];
    newQuestions[questionIndex].options = newQuestions[questionIndex].options.filter((_, i) => i !== optionIndex);
    setQuizQuestions(newQuestions);
  };

  const updateOption = (questionIndex: number, optionIndex: number, field: 'option_text' | 'is_correct', value: string | boolean) => {
    const newQuestions = [...quizQuestions];
    if (field === 'is_correct' && value === true) {
      // Une seule bonne réponse par question
      newQuestions[questionIndex].options = newQuestions[questionIndex].options.map((opt, i) => ({ ...opt, is_correct: i === optionIndex }));
    } else {
      newQuestions[questionIndex].options[optionIndex] = { ...newQuestions[questionIndex].options[optionIndex], [field]: value };
    }
    setQuizQuestions(newQuestions);
  };

  const openQuizForm = (existing?: Quiz) => {
    if (existing) {
      setQuizTitle(existing.title);
      setQuizDescription(existing.description || '');
      setQuizQuestions(
        (existing.questions || []).map((q) => ({
          question_text: q.question_text,
          type: q.type,
          answer_explanation: q.answer_explanation || '',
          options: (q.options || []).map((o) => ({ option_text: o.option_text, is_correct: o.is_correct ?? false })),
        }))
      );
    } else {
      setQuizTitle('');
      setQuizDescription('');
      setQuizQuestions([{ question_text: '', type: 'multiple_choice', answer_explanation: '', options: [{ option_text: '', is_correct: true }, { option_text: '', is_correct: false }] }]);
    }
    setOpenExplanations({});
    setShowQuizForm(true);
  };

  const handleSaveQuiz = async () => {
    if (!quizTitle.trim() || quizQuestions.length === 0) return;

    for (const q of quizQuestions) {
      if (!q.question_text.trim()) { alert('Toutes les questions doivent avoir un texte.'); return; }
      if (q.type === 'multiple_choice') {
        if (q.options.length < 2) { alert('Chaque QCM doit avoir au moins 2 options.'); return; }
        if (q.options.some((o) => !o.option_text.trim())) { alert('Toutes les options doivent être renseignées.'); return; }
        if (!q.options.some((o) => o.is_correct)) { alert('Chaque QCM doit avoir une bonne réponse.'); return; }
      }
    }

    try {
      setSavingQuiz(true);
      // Ne pas envoyer d'options pour les questions à réponse libre (le backend
      // valide min:2 options dès que le champ est présent)
      const payloadQuestions = quizQuestions.map((q) => ({
        question_text: q.question_text,
        type: q.type,
        answer_explanation: q.answer_explanation.trim() || undefined,
        ...(q.type === 'multiple_choice' ? { options: q.options } : {}),
      }));
      if (quiz) {
        const updated = await quizzesApi.update(quiz.id, { title: quizTitle, description: quizDescription, questions: payloadQuestions });
        setQuiz(updated);
        onChange?.(updated);
      } else {
        const created = await quizzesApi.create({ session_id: session.id, class_id: session.class_id, title: quizTitle, description: quizDescription, questions: payloadQuestions });
        setQuiz(created);
        onChange?.(created);
      }
      setShowQuizForm(false);
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Erreur lors de la sauvegarde du quiz.';
      alert(msg);
    } finally {
      setSavingQuiz(false);
    }
  };

  const handleDeleteQuiz = async () => {
    if (!quiz) return;
    if (!confirm('Supprimer ce quiz ? Les soumissions des élèves seront également supprimées.')) return;
    try {
      await quizzesApi.delete(quiz.id);
      setQuiz(null);
      onChange?.(null);
    } catch {
      alert('Erreur lors de la suppression du quiz.');
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <HelpCircle size={18} className="text-primary" />
          <p className="font-medium text-gray-700">Quiz</p>
          {quiz && (
            <span className="text-xs text-gray-500">({quiz.submissions_count ?? 0} soumission{(quiz.submissions_count ?? 0) > 1 ? 's' : ''})</span>
          )}
        </div>
        {!showQuizForm && !quiz && (
          <button onClick={() => openQuizForm()} className="text-primary hover:text-primary/80 text-sm flex items-center gap-1">
            <Plus size={14} />
            Créer
          </button>
        )}
      </div>

      {loadingQuiz ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 size={20} className="animate-spin text-primary" />
        </div>
      ) : showQuizForm ? (
        /* ── Formulaire de création/édition ── */
        <div className="bg-white border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">{quiz ? 'Modifier le quiz' : 'Nouveau quiz'}</p>
            <button onClick={() => setShowQuizForm(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>

          <input
            type="text"
            value={quizTitle}
            onChange={(e) => setQuizTitle(e.target.value)}
            placeholder="Titre du quiz *"
            className="input w-full text-sm"
          />
          <textarea
            value={quizDescription}
            onChange={(e) => setQuizDescription(e.target.value)}
            placeholder="Description (optionnel)"
            rows={2}
            className="input w-full text-sm resize-none"
          />

          {/* Questions */}
          <div className="space-y-4">
            {quizQuestions.map((question, qIndex) => (
              <div key={qIndex} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-gray-500 w-6">Q{qIndex + 1}</span>
                  <select
                    value={question.type}
                    onChange={(e) => updateQuestion(qIndex, 'type', e.target.value)}
                    className="input text-xs py-1 px-2"
                  >
                    <option value="multiple_choice">Choix multiple</option>
                    <option value="free_text">Réponse libre</option>
                  </select>
                  <div className="flex gap-1 ml-auto">
                    <button disabled={qIndex === 0} onClick={() => moveQuestion(qIndex, 'up')} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronUp size={14} /></button>
                    <button disabled={qIndex === quizQuestions.length - 1} onClick={() => moveQuestion(qIndex, 'down')} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronDown size={14} /></button>
                    <button onClick={() => removeQuestion(qIndex)} className="p-1 text-red-400 hover:text-red-600"><X size={14} /></button>
                  </div>
                </div>

                <input
                  type="text"
                  value={question.question_text}
                  onChange={(e) => updateQuestion(qIndex, 'question_text', e.target.value)}
                  placeholder="Texte de la question *"
                  className="input w-full text-sm mb-2"
                />

                {question.type === 'multiple_choice' && (
                  <div className="space-y-1.5">
                    {question.options.map((option, oIndex) => (
                      <div key={oIndex} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${qIndex}`}
                          checked={option.is_correct}
                          onChange={() => updateOption(qIndex, oIndex, 'is_correct', true)}
                          className="accent-green-600 flex-shrink-0"
                          title="Bonne réponse"
                        />
                        <input
                          type="text"
                          value={option.option_text}
                          onChange={(e) => updateOption(qIndex, oIndex, 'option_text', e.target.value)}
                          placeholder={`Option ${oIndex + 1}`}
                          className={`input flex-1 text-xs py-1 ${option.is_correct ? 'border-green-300 bg-green-50' : ''}`}
                        />
                        {question.options.length > 2 && (
                          <button onClick={() => removeOption(qIndex, oIndex)} className="p-0.5 text-red-400 hover:text-red-600 flex-shrink-0"><X size={12} /></button>
                        )}
                      </div>
                    ))}
                    <button onClick={() => addOption(qIndex)} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 mt-1">
                      <Plus size={12} />
                      Ajouter une option
                    </button>
                  </div>
                )}

                {/* Détail de la réponse (affiché à l'élève après soumission) */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setOpenExplanations((prev) => ({ ...prev, [qIndex]: !prev[qIndex] }))}
                    className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80"
                  >
                    {openExplanations[qIndex] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    Détail de la réponse
                    {question.answer_explanation.trim() && !openExplanations[qIndex] && (
                      <span className="text-[10px] text-gray-400">(renseigné)</span>
                    )}
                  </button>
                  {openExplanations[qIndex] && (
                    <textarea
                      value={question.answer_explanation}
                      onChange={(e) => updateQuestion(qIndex, 'answer_explanation', e.target.value)}
                      placeholder="Explication affichée à l'élève après soumission (optionnel)"
                      rows={3}
                      className="input w-full text-sm mt-2 resize-none"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          <button onClick={addQuestion} className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2">
            <Plus size={16} />
            Ajouter une question
          </button>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setShowQuizForm(false)} className="text-xs">Annuler</Button>
            <Button size="sm" onClick={handleSaveQuiz} disabled={!quizTitle.trim() || quizQuestions.length === 0 || savingQuiz} className="text-xs flex items-center gap-1">
              {savingQuiz ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              {savingQuiz ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </div>
        </div>
      ) : quiz ? (
        /* ── Quiz existant ── */
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle size={16} className="text-amber-600 flex-shrink-0" />
                <p className="text-sm font-medium text-amber-900 truncate">{quiz.title}</p>
              </div>
              <p className="text-xs text-amber-700 mb-2">
                {quiz.questions?.length ?? 0} question{(quiz.questions?.length ?? 0) > 1 ? 's' : ''} · {quiz.submissions_count ?? 0} soumission{(quiz.submissions_count ?? 0) > 1 ? 's' : ''}
              </p>
              {quiz.description && <p className="text-xs text-amber-600 mb-2 line-clamp-2">{quiz.description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => openQuizForm(quiz)} className="text-xs text-amber-700 hover:text-amber-900 flex items-center gap-1">
              <Edit size={12} />
              Modifier
            </button>
            {(quiz.submissions_count ?? 0) > 0 && (
              <Link href={`/admin/quizzes/${quiz.id}/results`} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                <Users size={12} />
                Voir résultats
              </Link>
            )}
            <button onClick={handleDeleteQuiz} className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1">
              <Trash2 size={12} />
              Supprimer
            </button>
          </div>
        </div>
      ) : (
        <p className="text-gray-400 text-xs text-center py-4">Aucun quiz</p>
      )}
    </div>
  );
}
