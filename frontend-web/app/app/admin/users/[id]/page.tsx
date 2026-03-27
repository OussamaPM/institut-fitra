'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Badge, UserAvatar } from '@/components/ui';
import { usersApi } from '@/lib/api/users';
import { trackingFormsApi } from '@/lib/api/tracking-forms';
import { reinscriptionApi, LevelsHistory } from '@/lib/api/reinscription';
import { User, TrackingFormAssignment } from '@/lib/types';

export default function UserDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const userId = parseInt(params.id as string);
  const trackingSectionRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [trackingHistory, setTrackingHistory] = useState<TrackingFormAssignment[]>([]);
  const [levelsHistory, setLevelsHistory] = useState<LevelsHistory>({});
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<TrackingFormAssignment | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await usersApi.getById(userId);
        setUser(userData);

        // Si c'est un élève, charger l'historique de suivi et l'historique des niveaux
        if (userData.role === 'student') {
          // Charger en parallèle
          const [trackingData, levelsData] = await Promise.all([
            trackingFormsApi.getStudentTracking(userId).catch(() => []),
            reinscriptionApi.getStudentHistory(userId).catch(() => ({})),
          ]);
          setTrackingHistory(trackingData);
          setLevelsHistory(levelsData);
        }
      } catch (err: any) {
        console.error('Failed to fetch user:', err);
        setError('Impossible de charger les données de l\'utilisateur.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  // Scroll to tracking section if tab=tracking in URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'tracking' && !isLoading && trackingSectionRef.current) {
      setTimeout(() => {
        trackingSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [searchParams, isLoading]);

  // Get answer for a question from assignment
  const getAnswer = (assignment: TrackingFormAssignment, questionId: number): string => {
    const response = assignment.responses?.find((r) => r.question_id === questionId);
    return response?.answer || '-';
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'teacher':
        return 'primary';
      case 'student':
        return 'info';
      default:
        return 'neutral';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrateur';
      case 'teacher':
        return 'Professeur';
      case 'student':
        return 'Élève';
      default:
        return role;
    }
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  if (error || !user) {
    return (
      <div className="p-8">
        <div className="bg-error/10 border border-error rounded-lg p-4">
          <p className="text-error">{error || 'Utilisateur introuvable.'}</p>
        </div>
      </div>
    );
  }

  const profile = user.student_profile || user.teacher_profile;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-primary hover:underline mb-4 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </button>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <UserAvatar
              firstName={profile?.first_name || ''}
              lastName={profile?.last_name || ''}
              gender={user.student_profile?.gender}
              profilePhoto={user.student_profile?.profile_photo}
              size="lg"
              showGenderBadge={user.role === 'student'}
            />
            <div>
              <h1 className="font-playfair text-4xl font-semibold text-secondary mb-2">
                {profile?.first_name} {profile?.last_name}
              </h1>
              <div className="flex items-center gap-3 text-gray-600">
                <span>{user.email}</span>
                <Badge variant={getRoleBadgeVariant(user.role)}>
                  {getRoleLabel(user.role)}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Link href={`/admin/users/${user.id}/edit`}>
              <Button variant="outline">
                Modifier
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informations générales */}
          <Card>
            <div className="p-6">
              <h2 className="font-playfair text-xl font-semibold text-secondary mb-4">
                Informations générales
              </h2>

              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <span className="text-gray-600">Prénom</span>
                  <span className="col-span-2 font-medium">{profile?.first_name || 'N/A'}</span>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <span className="text-gray-600">Nom</span>
                  <span className="col-span-2 font-medium">{profile?.last_name || 'N/A'}</span>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <span className="text-gray-600">Email</span>
                  <span className="col-span-2 font-medium">{user.email}</span>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <span className="text-gray-600">Téléphone</span>
                  <span className="col-span-2 font-medium">{profile?.phone || 'N/A'}</span>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <span className="text-gray-600">Rôle</span>
                  <span className="col-span-2">
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {getRoleLabel(user.role)}
                    </Badge>
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Informations spécifiques Student */}
          {user.role === 'student' && user.student_profile && (
            <Card>
              <div className="p-6">
                <h2 className="font-playfair text-xl font-semibold text-secondary mb-4">
                  Informations élève
                </h2>

                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-4">
                    <span className="text-gray-600">Genre</span>
                    <span className="col-span-2 font-medium flex items-center gap-2">
                      {user.student_profile.gender === 'male' ? (
                        <>
                          <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                          Homme
                        </>
                      ) : user.student_profile.gender === 'female' ? (
                        <>
                          <span className="w-3 h-3 rounded-full bg-pink-500"></span>
                          Femme
                        </>
                      ) : (
                        'N/A'
                      )}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <span className="text-gray-600">Date de naissance</span>
                    <span className="col-span-2 font-medium">
                      {formatDate(user.student_profile.date_of_birth)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <span className="text-gray-600">Adresse</span>
                    <span className="col-span-2 font-medium">
                      {user.student_profile.address || 'N/A'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <span className="text-gray-600">Ville</span>
                    <span className="col-span-2 font-medium">
                      {user.student_profile.city || 'N/A'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <span className="text-gray-600">Pays</span>
                    <span className="col-span-2 font-medium">
                      {user.student_profile.country || 'N/A'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <span className="text-gray-600">Contact d'urgence</span>
                    <span className="col-span-2 font-medium">
                      {user.student_profile.emergency_contact || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Informations spécifiques Teacher/Admin */}
          {(user.role === 'teacher' || user.role === 'admin') && user.teacher_profile && (
            <Card>
              <div className="p-6">
                <h2 className="font-playfair text-xl font-semibold text-secondary mb-4">
                  Informations professionnelles
                </h2>

                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-4">
                    <span className="text-gray-600">Spécialisation</span>
                    <span className="col-span-2 font-medium">
                      {user.teacher_profile.specialization}
                    </span>
                  </div>

                  {user.teacher_profile.bio && (
                    <div className="grid grid-cols-3 gap-4">
                      <span className="text-gray-600">Biographie</span>
                      <p className="col-span-2 text-gray-700 whitespace-pre-wrap">
                        {user.teacher_profile.bio}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          {/* Parcours de suivi - uniquement pour les élèves */}
          {user.role === 'student' && (
            <div ref={trackingSectionRef}>
              <Card>
                <div className="p-6">
                  <h2 className="font-playfair text-xl font-semibold text-secondary mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    Parcours de suivi
                  </h2>

                  {trackingHistory.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-sm">Aucun formulaire de suivi</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {trackingHistory.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => {
                            setSelectedAssignment(assignment);
                            setShowTrackingModal(true);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-secondary text-sm truncate">
                                {assignment.form?.title}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                {assignment.completed_at ? (
                                  <Badge variant="success" className="text-xs">Complété</Badge>
                                ) : (
                                  <Badge variant="warning" className="text-xs">En attente</Badge>
                                )}
                                <span className="text-xs text-gray-500">
                                  {new Date(assignment.sent_at).toLocaleDateString('fr-FR')}
                                </span>
                              </div>
                            </div>
                            <svg className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Historique des niveaux - uniquement pour les élèves */}
          {user.role === 'student' && (
            <Card>
              <div className="p-6">
                <h2 className="font-playfair text-xl font-semibold text-secondary mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  Historique des niveaux
                </h2>

                {Object.keys(levelsHistory).length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <p className="text-sm">Aucun niveau payé</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(levelsHistory).map(([programId, levels]) => (
                      <div key={programId}>
                        <h4 className="font-medium text-secondary text-sm mb-2 truncate">
                          {levels[0]?.program?.name}
                        </h4>
                        <div className="space-y-2">
                          {levels.map((entry) => (
                            <div
                              key={`${programId}-${entry.order_id}`}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                                  {entry.level_number}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium text-secondary truncate">
                                    {entry.level?.name || `Niveau ${entry.level_number}`}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0 ml-2">
                                <p className="text-xs font-medium text-secondary">
                                  {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(entry.amount)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(entry.paid_at).toLocaleDateString('fr-FR')}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Métadonnées - pour les non-élèves */}
          {user.role !== 'student' && (
            <Card>
              <div className="p-6">
                <h2 className="font-playfair text-xl font-semibold text-secondary mb-4">
                  Métadonnées
                </h2>

                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-600 block mb-1">Compte créé le</span>
                    <span className="font-medium">{formatDateTime(user.created_at)}</span>
                  </div>

                  <div>
                    <span className="text-gray-600 block mb-1">Dernière modification</span>
                    <span className="font-medium">{formatDateTime(user.updated_at)}</span>
                  </div>

                  <div>
                    <span className="text-gray-600 block mb-1">ID utilisateur</span>
                    <span className="font-mono font-medium">#{user.id}</span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Actions rapides */}
          <Card>
            <div className="p-6">
              <h2 className="font-playfair text-xl font-semibold text-secondary mb-4">
                Actions
              </h2>

              <div className="space-y-3">
                <Link href={`/admin/users/${user.id}/edit`} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Modifier
                  </Button>
                </Link>

                {user.role === 'student' && (
                  <Button variant="outline" className="w-full justify-start" disabled>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Voir les inscriptions
                  </Button>
                )}

                {(user.role === 'teacher' || user.role === 'admin') && (
                  <Button variant="outline" className="w-full justify-start" disabled>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Voir les programmes
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Modal détail formulaire de suivi */}
      {showTrackingModal && selectedAssignment && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => {
                setShowTrackingModal(false);
                setSelectedAssignment(null);
              }}
            />
            <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-secondary">
                    {selectedAssignment.form?.title}
                  </h2>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                    <span>
                      Envoyé le {new Date(selectedAssignment.sent_at).toLocaleDateString('fr-FR')}
                    </span>
                    {selectedAssignment.completed_at && (
                      <Badge variant="success">
                        Complété le {new Date(selectedAssignment.completed_at).toLocaleDateString('fr-FR')}
                      </Badge>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowTrackingModal(false);
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
                {selectedAssignment.form?.description && (
                  <p className="text-gray-600 italic">
                    {selectedAssignment.form.description}
                  </p>
                )}

                {selectedAssignment.completed_at ? (
                  // Afficher les questions et réponses
                  selectedAssignment.form?.questions?.map((question, index) => (
                    <div key={question.id} className="space-y-2">
                      <div className="font-medium text-secondary">
                        {index + 1}. {question.question}
                        {question.required && <span className="text-red-500 ml-1">*</span>}
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg text-gray-700">
                        {getAnswer(selectedAssignment, question.id)}
                      </div>
                    </div>
                  ))
                ) : (
                  // Formulaire non complété
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>L'élève n'a pas encore complété ce formulaire.</p>
                    <p className="text-sm mt-2">
                      {selectedAssignment.form?.questions?.length || 0} question(s) en attente de réponse
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
