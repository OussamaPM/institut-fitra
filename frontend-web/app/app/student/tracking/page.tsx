'use client';

import { useState, useEffect } from 'react';
import { studentTrackingApi } from '@/lib/api/tracking-forms';
import { Card, Button, Badge } from '@/components/ui';
import { TrackingForm, TrackingFormAssignment } from '@/lib/types';
import { Clock, CheckCircle, Edit3, Eye, X, Loader2, FileText } from 'lucide-react';

export default function StudentTrackingPage() {
  const [assignments, setAssignments] = useState<TrackingFormAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Form completion modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedForm, setSelectedForm] = useState<TrackingForm | null>(null);
  const [selectedAssignment, setSelectedAssignment] =
    useState<TrackingFormAssignment | null>(null);
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // View completed form modal
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewAssignment, setViewAssignment] =
    useState<TrackingFormAssignment | null>(null);

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      setIsLoading(true);
      const data = await studentTrackingApi.getMyForms();
      setAssignments(data);
    } catch (err) {
      console.error('Error loading forms:', err);
      setError('Erreur lors du chargement des formulaires.');
    } finally {
      setIsLoading(false);
    }
  };

  // Open form to complete
  const openFormModal = async (assignment: TrackingFormAssignment) => {
    if (assignment.completed_at) {
      // If already completed, show view modal
      setViewAssignment(assignment);
      setShowViewModal(true);
      return;
    }

    try {
      const data = await studentTrackingApi.getForm(assignment.form_id);
      setSelectedForm(data.form);
      setSelectedAssignment(data.assignment);

      // Initialize responses
      const initialResponses: Record<number, string> = {};
      data.form.questions?.forEach((q) => {
        initialResponses[q.id] = '';
      });
      setResponses(initialResponses);

      setShowFormModal(true);
    } catch (err: unknown) {
      console.error('Error loading form:', err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Erreur lors du chargement du formulaire.';
      setError(errorMessage);
    }
  };

  // Handle response change
  const handleResponseChange = (questionId: number, value: string) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  // Submit form
  const handleSubmit = async () => {
    if (!selectedForm || !selectedAssignment) return;

    // Validate required questions
    const requiredQuestions =
      selectedForm.questions?.filter((q) => q.required) || [];
    const missingResponses = requiredQuestions.filter(
      (q) => !responses[q.id]?.trim()
    );

    if (missingResponses.length > 0) {
      setSubmitError('Veuillez repondre a toutes les questions obligatoires.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      await studentTrackingApi.submit(selectedForm.id, {
        responses: Object.entries(responses).map(([questionId, answer]) => ({
          question_id: parseInt(questionId),
          answer,
        })),
      });

      setShowFormModal(false);
      setSelectedForm(null);
      setSelectedAssignment(null);
      setResponses({});
      loadAssignments();
    } catch (err: unknown) {
      console.error('Error submitting form:', err);
      const errorMessage =
        err instanceof Error ? err.message : "Erreur lors de l'enregistrement.";
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get answer for a question from completed assignment
  const getAnswer = (
    assignment: TrackingFormAssignment,
    questionId: number
  ): string => {
    const response = assignment.responses?.find(
      (r) => r.question_id === questionId
    );
    return response?.answer || '-';
  };

  // Separate pending and completed
  const pendingAssignments = assignments.filter((a) => !a.completed_at);
  const completedAssignments = assignments.filter((a) => a.completed_at);

  if (isLoading) {
    return (
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-playfair font-semibold text-secondary">
          Mon suivi
        </h1>
        <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">
          Consultez et completez les formulaires de suivi
        </p>
      </div>

      {error && (
        <div className="mb-4 md:mb-6 p-3 md:p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Pending forms */}
      <Card className="mb-4 md:mb-6">
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 bg-yellow-50 rounded-t-xl">
          <h2 className="font-semibold text-secondary text-sm md:text-base flex items-center">
            <Clock size={18} className="mr-2 text-yellow-600" />
            Formulaires a completer ({pendingAssignments.length})
          </h2>
        </div>

        {pendingAssignments.length === 0 ? (
          <div className="p-6 md:p-8 text-center text-gray-500 text-sm md:text-base">
            Aucun formulaire en attente
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {pendingAssignments.map((assignment) => (
              <div
                key={assignment.id}
                className="p-4 md:p-6 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-secondary text-sm md:text-base truncate">
                      {assignment.form?.title}
                    </h3>
                    {assignment.form?.description && (
                      <p className="text-xs md:text-sm text-gray-500 mt-1 line-clamp-2">
                        {assignment.form.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2 text-xs md:text-sm text-gray-500">
                      <span>{assignment.form?.questions?.length || 0} question(s)</span>
                      <span>
                        Envoye le{' '}
                        {new Date(assignment.sent_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={() => openFormModal(assignment)}
                    className="w-full sm:w-auto min-h-[44px] text-sm"
                  >
                    <Edit3 size={16} className="mr-2" />
                    Completer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Completed forms */}
      <Card>
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 bg-green-50 rounded-t-xl">
          <h2 className="font-semibold text-secondary text-sm md:text-base flex items-center">
            <CheckCircle size={18} className="mr-2 text-green-600" />
            Formulaires completes ({completedAssignments.length})
          </h2>
        </div>

        {completedAssignments.length === 0 ? (
          <div className="p-6 md:p-8 text-center text-gray-500 text-sm md:text-base">
            Aucun formulaire complete
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {completedAssignments.map((assignment) => (
              <div
                key={assignment.id}
                className="p-4 md:p-6 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-secondary text-sm md:text-base truncate">
                      {assignment.form?.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2 text-xs md:text-sm text-gray-500">
                      <span>
                        Complete le{' '}
                        {new Date(assignment.completed_at!).toLocaleDateString('fr-FR')}
                      </span>
                      <Badge variant="success">Complete</Badge>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setViewAssignment(assignment);
                      setShowViewModal(true);
                    }}
                    className="w-full sm:w-auto min-h-[44px] text-sm"
                  >
                    <Eye size={16} className="mr-2" />
                    Voir mes reponses
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Form completion modal */}
      {showFormModal && selectedForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end md:items-center justify-center min-h-screen p-0 md:px-4">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setShowFormModal(false)}
            />
            <div className="relative bg-white rounded-t-2xl md:rounded-xl shadow-xl w-full md:max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-4 md:px-6 py-3 md:py-4 z-10">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg md:text-xl font-semibold text-secondary truncate">
                      {selectedForm.title}
                    </h2>
                    {selectedForm.description && (
                      <p className="text-xs md:text-sm text-gray-500 mt-1 line-clamp-2">
                        {selectedForm.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setShowFormModal(false);
                      setSelectedForm(null);
                      setSelectedAssignment(null);
                      setResponses({});
                      setSubmitError('');
                    }}
                    className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                  >
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="p-4 md:p-6 space-y-5 md:space-y-6">
                {submitError && (
                  <div className="p-3 md:p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs md:text-sm">
                    {submitError}
                  </div>
                )}

                {selectedForm.questions?.map((question, index) => (
                  <div key={question.id} className="space-y-2">
                    <label className="block font-medium text-secondary text-sm md:text-base">
                      {index + 1}. {question.question}
                      {question.required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </label>

                    {question.type === 'text' ? (
                      <textarea
                        value={responses[question.id] || ''}
                        onChange={(e) =>
                          handleResponseChange(question.id, e.target.value)
                        }
                        className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm md:text-base"
                        rows={3}
                        placeholder="Votre reponse..."
                      />
                    ) : (
                      <div className="space-y-2">
                        {question.options?.map((option, optIndex) => (
                          <label
                            key={optIndex}
                            className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors min-h-[44px] ${
                              responses[question.id] === option
                                ? 'border-primary bg-primary/5'
                                : 'border-gray-200 hover:border-gray-300 active:bg-gray-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question-${question.id}`}
                              value={option}
                              checked={responses[question.id] === option}
                              onChange={(e) =>
                                handleResponseChange(question.id, e.target.value)
                              }
                              className="mr-3 w-4 h-4"
                            />
                            <span className="text-secondary text-sm md:text-base">{option}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="sticky bottom-0 bg-gray-50 border-t px-4 md:px-6 py-3 md:py-4 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowFormModal(false);
                    setSelectedForm(null);
                    setSelectedAssignment(null);
                    setResponses({});
                    setSubmitError('');
                  }}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto min-h-[44px] text-sm"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  isLoading={isSubmitting}
                  className="w-full sm:w-auto min-h-[44px] text-sm"
                >
                  {isSubmitting ? 'Envoi...' : 'Envoyer mes reponses'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View completed form modal */}
      {showViewModal && viewAssignment && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end md:items-center justify-center min-h-screen p-0 md:px-4">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => {
                setShowViewModal(false);
                setViewAssignment(null);
              }}
            />
            <div className="relative bg-white rounded-t-2xl md:rounded-xl shadow-xl w-full md:max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-4 md:px-6 py-3 md:py-4 flex items-start justify-between gap-3 z-10">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg md:text-xl font-semibold text-secondary truncate">
                    {viewAssignment.form?.title}
                  </h2>
                  <p className="text-xs md:text-sm text-gray-500 mt-1">
                    Complete le{' '}
                    {new Date(viewAssignment.completed_at!).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setViewAssignment(null);
                  }}
                  className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                {viewAssignment.form?.questions?.map((question, index) => (
                  <div key={question.id} className="space-y-2">
                    <div className="font-medium text-secondary text-sm md:text-base">
                      {index + 1}. {question.question}
                    </div>
                    <div className="p-3 md:p-4 bg-gray-50 rounded-lg text-gray-700 text-sm md:text-base">
                      {getAnswer(viewAssignment, question.id)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
