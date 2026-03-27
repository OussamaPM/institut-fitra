'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { trackingFormsApi } from '@/lib/api/tracking-forms';
import { classesApi } from '@/lib/api/classes';
import { Card, Button, Badge, UserAvatar } from '@/components/ui';
import {
  TrackingForm,
  TrackingFormAssignment,
  QuestionType,
  User,
  ClassModel,
} from '@/lib/types';

// Question type for form builder
interface QuestionData {
  id: string;
  question: string;
  type: QuestionType;
  options: string[];
  required: boolean;
}

export default function TrackingFormsPage() {
  const router = useRouter();
  const [forms, setForms] = useState<TrackingForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedForm, setSelectedForm] = useState<TrackingForm | null>(null);

  // Create form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Assign modal state
  const [classes, setClasses] = useState<ClassModel[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [availableStudents, setAvailableStudents] = useState<User[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [assignments, setAssignments] = useState<TrackingFormAssignment[]>([]);

  // Student responses modal state
  const [showResponsesModal, setShowResponsesModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<TrackingFormAssignment | null>(null);

  useEffect(() => {
    loadForms();
    loadClasses();
  }, []);

  const loadForms = async () => {
    try {
      setIsLoading(true);
      const response = await trackingFormsApi.getAll({ per_page: 100 });
      setForms(response.data || []);
    } catch (err) {
      console.error('Error loading forms:', err);
      setError('Erreur lors du chargement des formulaires.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadClasses = async () => {
    try {
      const response = await classesApi.getAll();
      const classesArray = response.data || [];
      setClasses(classesArray);
    } catch (err) {
      console.error('Error loading classes:', err);
    }
  };

  const loadStudents = async (classId?: number) => {
    try {
      const students = await trackingFormsApi.getAvailableStudents(
        classId ? { class_id: classId } : undefined
      );
      setAvailableStudents(students);
    } catch (err) {
      console.error('Error loading students:', err);
    }
  };

  const loadAssignments = async (formId: number) => {
    try {
      const data = await trackingFormsApi.getAssignments(formId);
      setAssignments(data);
    } catch (err) {
      console.error('Error loading assignments:', err);
    }
  };

  // Question management
  const addQuestion = () => {
    const newQuestion: QuestionData = {
      id: Date.now().toString(),
      question: '',
      type: 'text',
      options: [''],
      required: true,
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, field: keyof QuestionData, value: any) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const addOption = (questionId: string) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId ? { ...q, options: [...q.options, ''] } : q
      )
    );
  };

  const updateOption = (questionId: string, index: number, value: string) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.map((opt, i) => (i === index ? value : opt)),
            }
          : q
      )
    );
  };

  const removeOption = (questionId: string, index: number) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId
          ? { ...q, options: q.options.filter((_, i) => i !== index) }
          : q
      )
    );
  };

  // Create form
  const handleCreateForm = async () => {
    if (!formTitle.trim()) {
      setError('Le titre est obligatoire.');
      return;
    }

    if (questions.length === 0) {
      setError('Ajoutez au moins une question.');
      return;
    }

    const invalidQuestions = questions.filter(
      (q) =>
        !q.question.trim() ||
        (q.type === 'multiple_choice' &&
          q.options.filter((o) => o.trim()).length < 2)
    );

    if (invalidQuestions.length > 0) {
      setError(
        'Toutes les questions doivent avoir un texte. Les QCM doivent avoir au moins 2 options.'
      );
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await trackingFormsApi.create({
        title: formTitle,
        description: formDescription || undefined,
        questions: questions.map((q) => ({
          question: q.question,
          type: q.type,
          options: q.type === 'multiple_choice' ? q.options.filter((o) => o.trim()) : undefined,
          required: q.required,
        })),
      });

      setShowCreateModal(false);
      resetCreateForm();
      loadForms();
    } catch (err: any) {
      console.error('Error creating form:', err);
      setError(err.response?.data?.message || 'Erreur lors de la creation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setFormTitle('');
    setFormDescription('');
    setQuestions([]);
    setError('');
  };

  // Toggle active
  const handleToggleActive = async (form: TrackingForm) => {
    try {
      await trackingFormsApi.toggleActive(form.id);
      loadForms();
    } catch (err) {
      console.error('Error toggling form:', err);
    }
  };

  // Delete form
  const handleDelete = async (form: TrackingForm) => {
    if (!confirm(`Supprimer le formulaire "${form.title}" ?`)) return;

    try {
      await trackingFormsApi.delete(form.id);
      loadForms();
    } catch (err) {
      console.error('Error deleting form:', err);
    }
  };

  // Open assign modal
  const openAssignModal = (form: TrackingForm) => {
    setSelectedForm(form);
    setSelectedClassId(null);
    setSelectedStudentIds([]);
    loadStudents();
    setShowAssignModal(true);
  };

  // Handle class selection for students
  const handleClassSelect = async (classId: number | null) => {
    setSelectedClassId(classId);
    setSelectedStudentIds([]);
    if (classId) {
      await loadStudents(classId);
    } else {
      await loadStudents();
    }
  };

  // Toggle student selection
  const toggleStudentSelection = (studentId: number) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  // Select all students
  const selectAllStudents = () => {
    setSelectedStudentIds(availableStudents.map((s) => s.id));
  };

  // Deselect all
  const deselectAllStudents = () => {
    setSelectedStudentIds([]);
  };

  // Assign form
  const handleAssignForm = async () => {
    if (!selectedForm) return;

    if (selectedStudentIds.length === 0 && !selectedClassId) {
      setError('Sélectionnez au moins un élève ou une classe.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const result = await trackingFormsApi.assign(selectedForm.id, {
        student_ids: selectedStudentIds.length > 0 ? selectedStudentIds : undefined,
        class_id: selectedClassId || undefined,
      });

      alert(result.message);
      setShowAssignModal(false);
      loadForms();
    } catch (err: any) {
      console.error('Error assigning form:', err);
      setError(err.response?.data?.message || "Erreur lors de l'envoi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open view modal
  const openViewModal = async (form: TrackingForm) => {
    setSelectedForm(form);
    await loadAssignments(form.id);
    setShowViewModal(true);
  };

  // Open student responses modal
  const openResponsesModal = (assignment: TrackingFormAssignment) => {
    setSelectedAssignment(assignment);
    setShowResponsesModal(true);
  };

  // Get answer for a question from assignment
  const getAnswer = (assignment: TrackingFormAssignment, questionId: number): string => {
    const response = assignment.responses?.find((r) => r.question_id === questionId);
    return response?.answer || '-';
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-playfair text-4xl font-semibold text-secondary mb-2">
            Formulaires de suivi
          </h1>
          <p className="text-gray-600">
            Créez et gérez les questionnaires pour les élèves
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          + Nouveau formulaire
        </Button>
      </div>

      {/* Forms list */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Formulaire
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Questions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Complétés
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  En attente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {forms.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Aucun formulaire créé. Cliquez sur "Nouveau formulaire" pour commencer.
                  </td>
                </tr>
              ) : (
                forms.map((form) => (
                  <tr key={form.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-secondary">{form.title}</div>
                      {form.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {form.description}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        Créé le {new Date(form.created_at).toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {form.questions?.length || 0} question(s)
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-green-600">
                        {form.completed_count || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-yellow-600">
                        {form.pending_count || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={form.is_active ? 'success' : 'neutral'}>
                        {form.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openViewModal(form)}
                          title="Voir les réponses"
                        >
                          Réponses
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAssignModal(form)}
                          title="Envoyer aux élèves"
                        >
                          Envoyer
                        </Button>
                        <button
                          onClick={() => handleToggleActive(form)}
                          className={`p-2 rounded-lg transition-colors ${
                            form.is_active
                              ? 'text-yellow-600 hover:bg-yellow-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={form.is_active ? 'Désactiver' : 'Activer'}
                        >
                          {form.is_active ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(form)}
                          className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => {
                setShowCreateModal(false);
                resetCreateForm();
              }}
            />
            <div className="relative bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-secondary">
                  Nouveau formulaire
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetCreateForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}

                {/* Form info */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Titre du formulaire *
                    </label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Ex: Questionnaire de satisfaction"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (optionnel)
                    </label>
                    <textarea
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      rows={2}
                      placeholder="Description du formulaire..."
                    />
                  </div>
                </div>

                {/* Questions */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-secondary">Questions</h3>
                    <button
                      onClick={addQuestion}
                      className="text-sm text-primary hover:text-primary/80 flex items-center"
                    >
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      Ajouter une question
                    </button>
                  </div>

                  <div className="space-y-4">
                    {questions.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg text-gray-500">
                        Aucune question. Cliquez sur "Ajouter une question" pour
                        commencer.
                      </div>
                    ) : (
                      questions.map((q, index) => (
                        <div
                          key={q.id}
                          className="p-4 bg-gray-50 rounded-lg space-y-3"
                        >
                          <div className="flex items-start justify-between">
                            <span className="text-sm font-medium text-gray-500">
                              Question {index + 1}
                            </span>
                            <button
                              onClick={() => removeQuestion(q.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>

                          <input
                            type="text"
                            value={q.question}
                            onChange={(e) =>
                              updateQuestion(q.id, 'question', e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="Texte de la question"
                          />

                          <div className="flex items-center gap-4">
                            <select
                              value={q.type}
                              onChange={(e) =>
                                updateQuestion(
                                  q.id,
                                  'type',
                                  e.target.value as QuestionType
                                )
                              }
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            >
                              <option value="text">Réponse libre</option>
                              <option value="multiple_choice">
                                Choix multiples (QCM)
                              </option>
                            </select>

                            <label className="flex items-center text-sm text-gray-600">
                              <input
                                type="checkbox"
                                checked={q.required}
                                onChange={(e) =>
                                  updateQuestion(q.id, 'required', e.target.checked)
                                }
                                className="mr-2"
                              />
                              Obligatoire
                            </label>
                          </div>

                          {q.type === 'multiple_choice' && (
                            <div className="space-y-2 pl-4 border-l-2 border-gray-300">
                              <span className="text-sm text-gray-500">
                                Options de réponse :
                              </span>
                              {q.options.map((opt, optIndex) => (
                                <div
                                  key={optIndex}
                                  className="flex items-center gap-2"
                                >
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) =>
                                      updateOption(q.id, optIndex, e.target.value)
                                    }
                                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder={`Option ${optIndex + 1}`}
                                  />
                                  {q.options.length > 1 && (
                                    <button
                                      onClick={() => removeOption(q.id, optIndex)}
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M6 18L18 6M6 6l12 12"
                                        />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              ))}
                              <button
                                onClick={() => addOption(q.id)}
                                className="text-sm text-primary hover:text-primary/80"
                              >
                                + Ajouter une option
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetCreateForm();
                  }}
                  disabled={isSubmitting}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleCreateForm}
                  disabled={isSubmitting}
                  isLoading={isSubmitting}
                >
                  {isSubmitting ? 'Création...' : 'Créer le formulaire'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && selectedForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setShowAssignModal(false)}
            />
            <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4">
                <h2 className="text-xl font-semibold text-secondary">
                  Envoyer le formulaire
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedForm.title}
                </p>
              </div>

              <div className="p-6 space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}

                {/* Class filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filtrer par classe
                  </label>
                  <select
                    value={selectedClassId || ''}
                    onChange={(e) =>
                      handleClassSelect(
                        e.target.value ? parseInt(e.target.value) : null
                      )
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Tous les élèves</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.program?.name})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Students list */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Sélectionner les élèves ({selectedStudentIds.length}{' '}
                      sélectionné(s))
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={selectAllStudents}
                        className="text-xs text-primary hover:underline"
                      >
                        Tout sélectionner
                      </button>
                      <button
                        onClick={deselectAllStudents}
                        className="text-xs text-gray-500 hover:underline"
                      >
                        Tout désélectionner
                      </button>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                    {availableStudents.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        Aucun élève trouvé
                      </div>
                    ) : (
                      availableStudents.map((student) => (
                        <label
                          key={student.id}
                          className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                        >
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.includes(student.id)}
                            onChange={() => toggleStudentSelection(student.id)}
                            className="mr-3"
                          />
                          <UserAvatar
                            firstName={student.student_profile?.first_name || student.first_name || ''}
                            lastName={student.student_profile?.last_name || student.last_name || ''}
                            gender={student.student_profile?.gender}
                            profilePhoto={student.student_profile?.profile_photo}
                            size="sm"
                            showGenderBadge={true}
                            className="mr-3"
                          />
                          <div>
                            <div className="font-medium text-secondary">
                              {student.student_profile?.first_name || student.first_name} {student.student_profile?.last_name || student.last_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {student.email}
                            </div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowAssignModal(false)}
                  disabled={isSubmitting}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleAssignForm}
                  disabled={isSubmitting || selectedStudentIds.length === 0}
                  isLoading={isSubmitting}
                >
                  {isSubmitting
                    ? 'Envoi...'
                    : `Envoyer à ${selectedStudentIds.length} élève(s)`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Responses Modal */}
      {showViewModal && selectedForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setShowViewModal(false)}
            />
            <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-secondary">
                    {selectedForm.title}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {assignments.length} élève(s) assigné(s)
                  </p>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Élève
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Envoyé le
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Statut
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Complété le
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {assignments.map((assignment) => (
                      <tr key={assignment.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <UserAvatar
                              firstName={assignment.student?.student_profile?.first_name || assignment.student?.first_name || ''}
                              lastName={assignment.student?.student_profile?.last_name || assignment.student?.last_name || ''}
                              gender={assignment.student?.student_profile?.gender}
                              profilePhoto={assignment.student?.student_profile?.profile_photo}
                              size="sm"
                              showGenderBadge={true}
                              className="mr-3"
                            />
                            <div>
                              <div className="font-medium text-secondary">
                                {assignment.student?.student_profile?.first_name || assignment.student?.first_name}{' '}
                                {assignment.student?.student_profile?.last_name || assignment.student?.last_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {assignment.student?.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(assignment.sent_at).toLocaleDateString(
                            'fr-FR'
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              assignment.completed_at ? 'success' : 'warning'
                            }
                          >
                            {assignment.completed_at ? 'Complété' : 'En attente'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {assignment.completed_at
                            ? new Date(assignment.completed_at).toLocaleDateString(
                                'fr-FR'
                              )
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setShowViewModal(false);
                                router.push(`/admin/users/${assignment.student_id}`);
                              }}
                            >
                              Fiche
                            </Button>
                            {assignment.completed_at && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openResponsesModal(assignment)}
                              >
                                Réponses
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {assignments.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Ce formulaire n'a pas encore été envoyé à des élèves.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student Responses Modal */}
      {showResponsesModal && selectedAssignment && selectedForm && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => {
                setShowResponsesModal(false);
                setSelectedAssignment(null);
              }}
            />
            <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                <div className="flex items-center">
                  <UserAvatar
                    firstName={selectedAssignment.student?.student_profile?.first_name || selectedAssignment.student?.first_name || ''}
                    lastName={selectedAssignment.student?.student_profile?.last_name || selectedAssignment.student?.last_name || ''}
                    gender={selectedAssignment.student?.student_profile?.gender}
                    profilePhoto={selectedAssignment.student?.student_profile?.profile_photo}
                    size="md"
                    showGenderBadge={true}
                    className="mr-3"
                  />
                  <div>
                    <h2 className="text-xl font-semibold text-secondary">
                      {selectedAssignment.student?.student_profile?.first_name || selectedAssignment.student?.first_name}{' '}
                      {selectedAssignment.student?.student_profile?.last_name || selectedAssignment.student?.last_name}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {selectedForm.title} - Complété le {new Date(selectedAssignment.completed_at!).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowResponsesModal(false);
                    setSelectedAssignment(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-6">
                {selectedForm.questions?.map((question, index) => (
                  <div key={question.id} className="space-y-2">
                    <div className="font-medium text-secondary">
                      {index + 1}. {question.question}
                      {question.required && <span className="text-red-500 ml-1">*</span>}
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg text-gray-700">
                      {getAnswer(selectedAssignment, question.id)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowResponsesModal(false);
                    setSelectedAssignment(null);
                    router.push(`/admin/users/${selectedAssignment.student_id}`);
                  }}
                >
                  Voir la fiche élève
                </Button>
                <Button
                  onClick={() => {
                    setShowResponsesModal(false);
                    setSelectedAssignment(null);
                  }}
                >
                  Fermer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
