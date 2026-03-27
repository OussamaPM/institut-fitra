'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui';
import apiClient from '@/lib/api/client';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DashboardStats {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalAdmins: number;
  totalPrograms: number;
  activePrograms: number;
  totalClasses: number;
  activeClasses: number;
  totalSessions: number;
  upcomingSessions: number;
  completedSessions: number;
  totalEnrollments: number;
  activeEnrollments: number;
  pendingEnrollments: number;
}

interface TodaySession {
  id: number;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  class: {
    id: number;
    name: string;
    zoom_link?: string;
    program: {
      id: number;
      name: string;
    };
    students_count: number;
  };
  has_materials: boolean;
  materials_count: number;
  has_replay: boolean;
}

interface FailedPayment {
  id: number;
  order_id: number;
  amount: number;
  installment_number: number;
  error_message?: string;
  updated_at: string;
  student: {
    id?: number;
    first_name?: string;
    last_name?: string;
    email: string;
  };
  program: {
    id: number;
    name: string;
  };
}

interface SessionWithoutReplay {
  id: number;
  title: string;
  scheduled_at: string;
  class: {
    id: number;
    name: string;
  };
  program: {
    id: number;
    name: string;
  };
  teacher: {
    id: number;
    first_name: string;
    last_name: string;
  };
}

interface UnreadMessage {
  id: number;
  content: string;
  created_at: string;
  sender: {
    id: number;
    first_name: string;
    last_name: string;
  };
}

interface RecentStudent {
  id: number;
  student: {
    id?: number;
    first_name?: string;
    last_name?: string;
    email: string;
    photo_url?: string;
  };
  program: {
    id: number;
    name: string;
  };
  class?: {
    id: number;
    name: string;
  };
  payment_method: string;
  total_amount: number;
  created_at: string;
}

interface UpcomingSession {
  id: number;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  class: {
    name: string;
    program: {
      name: string;
    };
  };
  teacher: {
    first_name: string;
    last_name: string;
  };
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todaySessions, setTodaySessions] = useState<TodaySession[]>([]);
  const [failedPayments, setFailedPayments] = useState<FailedPayment[]>([]);
  const [failedPaymentsCount, setFailedPaymentsCount] = useState(0);
  const [sessionsWithoutReplay, setSessionsWithoutReplay] = useState<SessionWithoutReplay[]>([]);
  const [sessionsWithoutReplayCount, setSessionsWithoutReplayCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentUnread, setRecentUnread] = useState<UnreadMessage[]>([]);
  const [recentStudents, setRecentStudents] = useState<RecentStudent[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Charger toutes les données en parallèle
      const [
        statsRes,
        todaySessionsRes,
        alertsRes,
        unreadMessagesRes,
        recentStudentsRes,
        upcomingSessionsRes,
      ] = await Promise.all([
        apiClient.get('/admin/dashboard/stats'),
        apiClient.get('/admin/dashboard/today-sessions'),
        apiClient.get('/admin/dashboard/alerts'),
        apiClient.get('/admin/dashboard/unread-messages'),
        apiClient.get('/admin/dashboard/recent-students'),
        apiClient.get('/admin/dashboard/upcoming-sessions'),
      ]);

      setStats(statsRes.data.stats);
      setTodaySessions(todaySessionsRes.data.sessions);
      setFailedPayments(alertsRes.data.failed_payments);
      setFailedPaymentsCount(alertsRes.data.failed_payments_count);
      setSessionsWithoutReplay(alertsRes.data.sessions_without_replay);
      setSessionsWithoutReplayCount(alertsRes.data.sessions_without_replay_count);
      setUnreadCount(unreadMessagesRes.data.unread_count);
      setRecentUnread(unreadMessagesRes.data.recent_unread);
      setRecentStudents(recentStudentsRes.data.recent_students);
      setUpcomingSessions(upcomingSessionsRes.data.sessions);
    } catch (err: unknown) {
      console.error('Failed to load dashboard data:', err);
      setError('Impossible de charger les statistiques.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm', { locale: fr });
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMM yyyy', { locale: fr });
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "dd MMM 'à' HH:mm", { locale: fr });
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'stripe':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
          </svg>
        );
      case 'free':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-secondary">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-playfair text-3xl md:text-4xl font-semibold text-secondary mb-2">
          Tableau de bord
        </h1>
        <p className="text-gray-600">
          {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error rounded-lg">
          <p className="text-error text-sm">{error}</p>
        </div>
      )}

      {/* Today's Sessions - Only show if admin has sessions today */}
      {todaySessions.length > 0 && (
        <div className="mb-8">
          <h2 className="font-playfair text-xl font-semibold text-secondary mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Mes sessions du jour
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {todaySessions.slice(0, 2).map((session) => {
              const zoomLink = session.class.zoom_link;
              return (
                <Card key={session.id} className="border-l-4 border-l-primary">
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-secondary">{session.title}</h3>
                        <p className="text-sm text-gray-500">
                          {session.class.program.name} - {session.class.name}
                        </p>
                      </div>
                      <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                        {formatTime(session.scheduled_at)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {session.duration_minutes} min
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        {session.class.students_count} élèves
                      </span>
                      {session.has_materials && (
                        <span className="flex items-center gap-1 text-green-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {session.materials_count} support{session.materials_count > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {zoomLink && (
                        <a
                          href={zoomLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h10.5a3 3 0 003-3v-2.25l3.75 2.25V9l-3.75 2.25V7.5a3 3 0 00-3-3H4.5z" />
                          </svg>
                          Rejoindre Zoom
                        </a>
                      )}
                      <Link
                        href={`/admin/sessions?session=${session.id}`}
                        className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        {session.has_materials ? 'Gérer supports' : 'Ajouter support'}
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          {todaySessions.length > 2 && (
            <p className="text-sm text-gray-500 mt-2">
              + {todaySessions.length - 2} autre{todaySessions.length - 2 > 1 ? 's' : ''} session{todaySessions.length - 2 > 1 ? 's' : ''} aujourd&apos;hui
            </p>
          )}
        </div>
      )}

      {/* Alerts Section */}
      {(failedPaymentsCount > 0 || sessionsWithoutReplayCount > 0 || unreadCount > 0) && (
        <div className="mb-8">
          <h2 className="font-playfair text-xl font-semibold text-secondary mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Actions requises
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Failed Payments Alert */}
            {failedPaymentsCount > 0 && (
              <Card className="border-l-4 border-l-red-500">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-red-600 font-semibold flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Paiements échoués
                    </span>
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-bold">
                      {failedPaymentsCount}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {failedPaymentsCount} paiement{failedPaymentsCount > 1 ? 's' : ''} en échec à traiter
                  </p>
                  <Link
                    href="/admin/orders?status=failed"
                    className="text-sm text-red-600 hover:underline font-medium"
                  >
                    Voir les détails →
                  </Link>
                </div>
              </Card>
            )}

            {/* Sessions Without Replay Alert */}
            {sessionsWithoutReplayCount > 0 && (
              <Card className="border-l-4 border-l-orange-500">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-orange-600 font-semibold flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Sessions sans replay
                    </span>
                    <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-bold">
                      {sessionsWithoutReplayCount}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {sessionsWithoutReplayCount} session{sessionsWithoutReplayCount > 1 ? 's' : ''} terminée{sessionsWithoutReplayCount > 1 ? 's' : ''} sans replay
                  </p>
                  <Link
                    href="/admin/supports"
                    className="text-sm text-orange-600 hover:underline font-medium"
                  >
                    Ajouter les replays →
                  </Link>
                </div>
              </Card>
            )}

            {/* Unread Messages Alert */}
            {unreadCount > 0 && (
              <Card className="border-l-4 border-l-blue-500">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-blue-600 font-semibold flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Messages non lus
                    </span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-bold">
                      {unreadCount}
                    </span>
                  </div>
                  {recentUnread.length > 0 && (
                    <p className="text-sm text-gray-600 mb-3 truncate">
                      De {recentUnread[0].sender.first_name} {recentUnread[0].sender.last_name}
                    </p>
                  )}
                  <Link
                    href="/admin/messages"
                    className="text-sm text-blue-600 hover:underline font-medium"
                  >
                    Lire les messages →
                  </Link>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Élèves</p>
                <p className="text-2xl font-bold text-secondary">{stats?.totalStudents || 0}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Classes actives</p>
                <p className="text-2xl font-bold text-secondary">{stats?.activeClasses || 0}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Sessions à venir</p>
                <p className="text-2xl font-bold text-secondary">{stats?.upcomingSessions || 0}</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Inscriptions actives</p>
                <p className="text-2xl font-bold text-secondary">{stats?.activeEnrollments || 0}</p>
              </div>
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Two columns: Upcoming Sessions & Recent Students */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Upcoming Sessions */}
        <Card>
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-playfair text-lg font-semibold text-secondary">
                Prochaines sessions
              </h3>
              <Link href="/admin/sessions" className="text-primary text-sm hover:underline">
                Voir tout
              </Link>
            </div>
            {upcomingSessions.length > 0 ? (
              <div className="space-y-3">
                {upcomingSessions.map((session) => (
                  <div key={session.id} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                    <div className="bg-primary/10 rounded-lg px-2 py-1 text-center min-w-[50px]">
                      <p className="text-xs text-gray-500">{format(new Date(session.scheduled_at), 'dd MMM', { locale: fr })}</p>
                      <p className="text-sm font-bold text-primary">{formatTime(session.scheduled_at)}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-secondary text-sm truncate">{session.title}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {session.class?.program?.name} - {session.class?.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">Aucune session planifiée</p>
              </div>
            )}
          </div>
        </Card>

        {/* Recent Students */}
        <Card>
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-playfair text-lg font-semibold text-secondary">
                Dernières inscriptions
              </h3>
              <Link href="/admin/orders" className="text-primary text-sm hover:underline">
                Voir tout
              </Link>
            </div>
            {recentStudents.length > 0 ? (
              <div className="space-y-3">
                {recentStudents.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                    <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      {order.student.photo_url ? (
                        <img
                          src={order.student.photo_url}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-primary font-semibold text-xs">
                          {(order.student.first_name?.[0] || order.student.email[0]).toUpperCase()}
                          {(order.student.last_name?.[0] || '').toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-secondary text-sm truncate">
                        {order.student.first_name || ''} {order.student.last_name || order.student.email}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{order.program.name}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-gray-400">{getPaymentMethodIcon(order.payment_method)}</span>
                      <span className="text-xs text-gray-500">{formatDate(order.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <p className="text-sm">Aucune inscription récente</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="font-playfair text-xl font-semibold text-secondary mb-4">
          Actions rapides
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href="/admin/users">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <div className="p-4 text-center">
                <svg className="w-7 h-7 text-primary mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <p className="text-sm font-medium text-secondary">Utilisateurs</p>
              </div>
            </Card>
          </Link>

          <Link href="/admin/programs">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <div className="p-4 text-center">
                <svg className="w-7 h-7 text-primary mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <p className="text-sm font-medium text-secondary">Programmes</p>
              </div>
            </Card>
          </Link>

          <Link href="/admin/classes">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <div className="p-4 text-center">
                <svg className="w-7 h-7 text-primary mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <p className="text-sm font-medium text-secondary">Classes</p>
              </div>
            </Card>
          </Link>

          <Link href="/admin/sessions">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <div className="p-4 text-center">
                <svg className="w-7 h-7 text-primary mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm font-medium text-secondary">Sessions</p>
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
