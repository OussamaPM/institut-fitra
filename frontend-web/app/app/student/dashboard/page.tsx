'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { enrollmentsApi, sessionsApi, failedPaymentsApi } from '@/lib/api';
import { reinscriptionApi } from '@/lib/api/reinscription';
import { FailedPayment } from '@/lib/api/failed-payments';
import { Enrollment, Session, AvailableReinscription } from '@/lib/types';
import { format, parseISO, isAfter, isBefore, addHours } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function StudentDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [availableReinscriptions, setAvailableReinscriptions] = useState<AvailableReinscription[]>([]);
  const [failedPayments, setFailedPayments] = useState<FailedPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecoveryLoading, setIsRecoveryLoading] = useState<number | null>(null);
  const [error, setError] = useState('');

  // Extraire le prenom depuis le profil etudiant
  const firstName = user?.student_profile?.first_name || user?.email?.split('@')[0] || 'Eleve';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Charger les inscriptions, sessions, réinscriptions disponibles et paiements échoués
      const [enrollmentsData, sessionsData, reinscriptionsData, failedPaymentsData] = await Promise.all([
        enrollmentsApi.getMyEnrollments(),
        sessionsApi.getAll({ per_page: 100 }),
        reinscriptionApi.getAvailable().catch(() => []), // Ne pas bloquer si erreur
        failedPaymentsApi.getAll().catch(() => ({ failed_payments: [] })), // Ne pas bloquer si erreur
      ]);

      setEnrollments(enrollmentsData.filter(e => e.status === 'active'));
      setAvailableReinscriptions(reinscriptionsData);
      setFailedPayments(failedPaymentsData.failed_payments || []);

      // Filtrer les sessions à venir (aujourd'hui et futur)
      const now = new Date();
      const upcoming = sessionsData.data
        .filter(s => s.status !== 'cancelled' && isAfter(parseISO(s.scheduled_at), addHours(now, -2)))
        .sort((a, b) => parseISO(a.scheduled_at).getTime() - parseISO(b.scheduled_at).getTime())
        .slice(0, 5);

      setUpcomingSessions(upcoming);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des donnees';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getSessionStatusBadge = (session: Session) => {
    const now = new Date();
    const sessionStart = parseISO(session.scheduled_at);
    const sessionEnd = addHours(sessionStart, session.duration_minutes / 60);

    if (session.status === 'completed') {
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">Termine</span>;
    }
    if (session.status === 'cancelled') {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-600">Annule</span>;
    }
    if (isAfter(now, sessionStart) && isBefore(now, sessionEnd)) {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-600 animate-pulse">En cours</span>;
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-600">A venir</span>;
  };

  const canJoinSession = (session: Session) => {
    const now = new Date();
    const sessionStart = parseISO(session.scheduled_at);
    const sessionEnd = addHours(sessionStart, session.duration_minutes / 60);
    // Permettre de rejoindre 15 minutes avant et pendant la session
    const canJoinFrom = addHours(sessionStart, -0.25);
    const zoomLink = session.class?.zoom_link;
    return zoomLink && isAfter(now, canJoinFrom) && isBefore(now, sessionEnd);
  };

  const getZoomLink = (session: Session) => {
    return session.class?.zoom_link;
  };

  const handleRecoveryPayment = async (paymentId: number) => {
    try {
      setIsRecoveryLoading(paymentId);
      const result = await failedPaymentsApi.createRecoverySession(paymentId);
      window.location.href = result.checkout_url;
    } catch (err) {
      console.error('Erreur lors de la création de la session de régularisation:', err);
      setError('Erreur lors de la création du paiement. Veuillez réessayer.');
      setIsRecoveryLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-2/3 md:w-1/3"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 md:h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-playfair font-semibold text-secondary">
          Bienvenue, {firstName} !
        </h1>
        <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">
          Voici un apercu de votre espace eleve
        </p>
      </div>

      {error && (
        <div className="mb-4 md:mb-6 p-3 md:p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Alerte Paiements Echoues */}
      {failedPayments.length > 0 && (
        <div className="mb-6 md:mb-8">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 md:p-6">
            <div className="flex items-start gap-3 md:gap-4 mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 md:w-6 md:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-semibold text-red-700">
                  Paiement en attente de regularisation
                </h2>
                <p className="text-sm text-red-600 mt-1">
                  {failedPayments.length === 1
                    ? 'Un paiement a echoue et necessite votre attention'
                    : `${failedPayments.length} paiements ont echoue et necessitent votre attention`
                  }
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {failedPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="bg-white rounded-lg border border-red-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-secondary truncate">
                        {payment.program_name}
                      </h3>
                      {payment.level_name && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {payment.level_name}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Echeance {payment.installment_number}/{payment.installments_count} - {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(payment.amount)}
                    </p>
                    {payment.error_message && (
                      <p className="text-xs text-red-500 mt-1">
                        {payment.error_message}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRecoveryPayment(payment.id)}
                    disabled={isRecoveryLoading === payment.id}
                    className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 active:bg-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    {isRecoveryLoading === payment.id ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Chargement...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        Regulariser
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 border border-gray-100">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 md:w-6 md:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold text-secondary">{enrollments.length}</p>
              <p className="text-xs md:text-sm text-gray-500">Classe{enrollments.length > 1 ? 's' : ''} inscrite{enrollments.length > 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 border border-gray-100">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 md:w-6 md:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold text-secondary">{upcomingSessions.length}</p>
              <p className="text-xs md:text-sm text-gray-500">Session{upcomingSessions.length > 1 ? 's' : ''} a venir</p>
            </div>
          </div>
        </div>

      </div>

      {/* Bloc Réinscription - Affiché si des niveaux sont disponibles */}
      {availableReinscriptions.length > 0 && (
        <div className="mb-6 md:mb-8">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20 p-4 md:p-6">
            <div className="flex items-start gap-3 md:gap-4 mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 md:w-6 md:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-semibold text-secondary">
                  Continuez votre progression !
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {availableReinscriptions.length === 1
                    ? 'Un nouveau niveau est disponible pour vous'
                    : `${availableReinscriptions.length} nouveaux niveaux sont disponibles pour vous`
                  }
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableReinscriptions.map((reinscription) => (
                <div
                  key={`${reinscription.program.id}-${reinscription.level.id}`}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-secondary text-sm md:text-base truncate">
                        {reinscription.program.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Niveau {reinscription.current_level} → Niveau {reinscription.level.level_number}
                      </p>
                    </div>
                    <span className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary font-medium flex-shrink-0">
                      Niveau {reinscription.level.level_number}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {reinscription.level.name}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">
                      {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(reinscription.level.price)}
                    </span>
                    <button
                      onClick={() => router.push(`/student/reinscription/${reinscription.program.id}/${reinscription.level.id}`)}
                      className="px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 active:bg-primary/80 transition-colors"
                    >
                      S'inscrire
                    </button>
                  </div>

                  {reinscription.level.max_installments > 1 && (
                    <p className="text-xs text-gray-500 mt-2">
                      Paiement en {reinscription.level.max_installments}× possible
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Mes Classes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 md:p-6 border-b border-gray-100">
            <h2 className="text-base md:text-lg font-semibold text-secondary">Mes Classes</h2>
          </div>
          <div className="p-4 md:p-6">
            {enrollments.length === 0 ? (
              <div className="text-center py-6 md:py-8">
                <svg className="w-10 h-10 md:w-12 md:h-12 text-gray-300 mx-auto mb-3 md:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <p className="text-gray-500 text-sm md:text-base">Vous n&apos;etes inscrit a aucune classe</p>
              </div>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {enrollments.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="p-3 md:p-4 border border-gray-100 rounded-lg hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-secondary text-sm md:text-base truncate">
                          {enrollment.class?.program?.name || 'Programme'}
                        </h3>
                        <p className="text-xs md:text-sm text-gray-500 mt-0.5 md:mt-1 truncate">
                          {enrollment.class?.name}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 md:mt-1">
                          Annee {enrollment.class?.academic_year}
                        </p>
                      </div>
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-600 flex-shrink-0">
                        Actif
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Prochaines Sessions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base md:text-lg font-semibold text-secondary">Prochaines Sessions</h2>
            <button
              onClick={() => router.push('/student/planning')}
              className="text-xs md:text-sm text-primary hover:text-primary/80 transition-colors"
            >
              Voir tout
            </button>
          </div>
          <div className="p-4 md:p-6">
            {upcomingSessions.length === 0 ? (
              <div className="text-center py-6 md:py-8">
                <svg className="w-10 h-10 md:w-12 md:h-12 text-gray-300 mx-auto mb-3 md:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-500 text-sm md:text-base">Aucune session a venir</p>
              </div>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {upcomingSessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-3 md:p-4 border border-gray-100 rounded-lg hover:border-primary/30 transition-colors cursor-pointer active:bg-gray-50"
                    onClick={() => router.push(`/student/planning?session=${session.id}`)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-medium text-secondary text-sm md:text-base line-clamp-2">{session.title}</h3>
                      {getSessionStatusBadge(session)}
                    </div>
                    <p className="text-xs md:text-sm text-gray-500 truncate">
                      {session.class?.program?.name}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2 md:mt-3 text-xs md:text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="hidden sm:inline">{format(parseISO(session.scheduled_at), 'EEEE d MMMM', { locale: fr })}</span>
                        <span className="sm:hidden">{format(parseISO(session.scheduled_at), 'd MMM', { locale: fr })}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {format(parseISO(session.scheduled_at), 'HH:mm', { locale: fr })}
                      </span>
                    </div>
                    {canJoinSession(session) && getZoomLink(session) && (
                      <a
                        href={getZoomLink(session)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="mt-3 inline-flex items-center gap-2 px-3 md:px-4 py-2 bg-blue-600 text-white text-xs md:text-sm rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors w-full sm:w-auto justify-center sm:justify-start min-h-[44px]"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Rejoindre la session
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 md:mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
        <h2 className="text-base md:text-lg font-semibold text-secondary mb-3 md:mb-4">Actions rapides</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <button
            onClick={() => router.push('/student/planning')}
            className="p-3 md:p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 active:bg-primary/10 transition-colors text-center min-h-[80px] md:min-h-[100px] flex flex-col items-center justify-center"
          >
            <svg className="w-6 h-6 md:w-8 md:h-8 text-primary mx-auto mb-1.5 md:mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs md:text-sm font-medium text-secondary">Planning</span>
          </button>

          <button
            onClick={() => router.push('/student/messages')}
            className="p-3 md:p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 active:bg-primary/10 transition-colors text-center min-h-[80px] md:min-h-[100px] flex flex-col items-center justify-center"
          >
            <svg className="w-6 h-6 md:w-8 md:h-8 text-primary mx-auto mb-1.5 md:mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs md:text-sm font-medium text-secondary">Messagerie</span>
          </button>

          <button
            onClick={() => router.push('/student/profile')}
            className="p-3 md:p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 active:bg-primary/10 transition-colors text-center min-h-[80px] md:min-h-[100px] flex flex-col items-center justify-center"
          >
            <svg className="w-6 h-6 md:w-8 md:h-8 text-primary mx-auto mb-1.5 md:mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs md:text-sm font-medium text-secondary">Mon profil</span>
          </button>

          <button
            onClick={() => {
              const liveSession = upcomingSessions.find(s => canJoinSession(s));
              const zoomLink = liveSession ? getZoomLink(liveSession) : null;
              if (zoomLink) {
                window.open(zoomLink, '_blank');
              }
            }}
            disabled={!upcomingSessions.some(s => canJoinSession(s))}
            className="p-3 md:p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 active:bg-blue-100 transition-colors text-center disabled:opacity-50 disabled:cursor-not-allowed min-h-[80px] md:min-h-[100px] flex flex-col items-center justify-center"
          >
            <svg className="w-6 h-6 md:w-8 md:h-8 text-blue-600 mx-auto mb-1.5 md:mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="text-xs md:text-sm font-medium text-secondary">Rejoindre Zoom</span>
          </button>
        </div>
      </div>
    </div>
  );
}
