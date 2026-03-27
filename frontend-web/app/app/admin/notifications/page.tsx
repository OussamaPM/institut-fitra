'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import notificationsApi from '@/lib/api/notifications';
import { Notification, NotificationType } from '@/lib/types';

const typeLabels: Record<NotificationType, string> = {
  session: 'Session',
  message: 'Message',
  enrollment: 'Inscription',
  material: 'Support',
  payment: 'Paiement',
  level: 'Niveau',
  other: 'Autre',
};

const typeColors: Record<NotificationType, string> = {
  session: 'bg-blue-100 text-blue-800',
  message: 'bg-purple-100 text-purple-800',
  enrollment: 'bg-green-100 text-green-800',
  material: 'bg-yellow-100 text-yellow-800',
  payment: 'bg-primary/10 text-primary',
  level: 'bg-teal-100 text-teal-800',
  other: 'bg-gray-100 text-gray-800',
};

const categoryIcons: Record<string, JSX.Element> = {
  payment_success: (
    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  payment_failed: (
    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  payment_action_required: (
    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  payment_uncollectible: (
    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  ),
  level_available: (
    <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
};

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, [filter]);

  const loadNotifications = async (loadMore = false) => {
    try {
      setIsLoading(true);
      const currentPage = loadMore ? page + 1 : 1;
      const params: { type?: string; per_page: number; page: number } = {
        per_page: 20,
        page: currentPage,
      };
      if (filter !== 'all') {
        params.type = filter;
      }

      const response = await notificationsApi.getAll(params);
      const newNotifications = response.data;

      if (loadMore) {
        setNotifications((prev) => [...prev, ...newNotifications]);
        setPage(currentPage);
      } else {
        setNotifications(newNotifications);
        setPage(1);
      }

      setHasMore(response.current_page < response.last_page);
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (notif: Notification) => {
    if (notif.read_at) return;

    try {
      await notificationsApi.markAsRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read_at: new Date().toISOString() } : n))
      );
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleDeleteRead = async () => {
    if (!confirm('Supprimer toutes les notifications lues ?')) return;

    try {
      await notificationsApi.deleteRead();
      setNotifications((prev) => prev.filter((n) => !n.read_at));
    } catch (err) {
      console.error('Error deleting read notifications:', err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-playfair text-3xl font-bold text-secondary">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                {unreadCount} notification{unreadCount > 1 ? 's' : ''} non lue{unreadCount > 1 ? 's' : ''}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-primary hover:text-primary/80 font-medium"
              >
                Tout marquer comme lu
              </button>
            )}
            {notifications.some((n) => n.read_at) && (
              <button
                onClick={handleDeleteRead}
                className="text-sm text-red-600 hover:text-red-500 font-medium"
              >
                Supprimer les lues
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
              filter === 'all'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Toutes
          </button>
          {(['payment', 'level', 'session', 'message', 'enrollment', 'material'] as NotificationType[]).map(
            (type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  filter === type
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {typeLabels[type]}
              </button>
            )
          )}
        </div>

        {/* Notifications List */}
        {isLoading && notifications.length === 0 ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <svg
              className="w-16 h-16 mx-auto text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <p className="text-gray-500">Aucune notification</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm divide-y">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleMarkAsRead(notif)}
                className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                  !notif.read_at ? 'bg-primary/5' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {notif.category && categoryIcons[notif.category]
                      ? categoryIcons[notif.category]
                      : (
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                          />
                        </svg>
                      )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[notif.type]}`}>
                        {typeLabels[notif.type]}
                      </span>
                      {!notif.read_at && <span className="w-2 h-2 bg-primary rounded-full"></span>}
                    </div>
                    <h3 className={`font-medium ${notif.read_at ? 'text-gray-700' : 'text-secondary'}`}>
                      {notif.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {format(new Date(notif.created_at), "d MMMM yyyy 'a' HH:mm", { locale: fr })}
                    </p>
                  </div>

                  {/* Action link */}
                  {notif.action_url && (
                    <a
                      href={notif.action_url}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-shrink-0 text-primary hover:text-primary/80"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More */}
        {hasMore && notifications.length > 0 && (
          <div className="text-center pt-6">
            <button
              onClick={() => loadNotifications(true)}
              disabled={isLoading}
              className="px-6 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {isLoading ? 'Chargement...' : 'Charger plus'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
