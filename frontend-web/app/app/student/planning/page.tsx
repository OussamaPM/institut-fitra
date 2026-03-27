'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { sessionsApi, enrollmentsApi } from '@/lib/api';
import materialsApi from '@/lib/api/materials';
import { Session, Enrollment, SessionMaterial } from '@/lib/types';
import { format, parseISO, isAfter, isBefore, addHours, addMinutes, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FileText, Image as ImageIcon, Download, Loader2, Play, X, ChevronLeft, ChevronRight, Calendar, List, Video } from 'lucide-react';

// Couleurs par classe (rotation)
const CLASS_COLORS = [
  { bg: 'bg-indigo-100', border: 'border-l-indigo-500', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  { bg: 'bg-emerald-100', border: 'border-l-emerald-500', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  { bg: 'bg-orange-100', border: 'border-l-orange-500', text: 'text-orange-700', dot: 'bg-orange-500' },
  { bg: 'bg-sky-100', border: 'border-l-sky-500', text: 'text-sky-700', dot: 'bg-sky-500' },
  { bg: 'bg-pink-100', border: 'border-l-pink-500', text: 'text-pink-700', dot: 'bg-pink-500' },
  { bg: 'bg-amber-100', border: 'border-l-amber-500', text: 'text-amber-700', dot: 'bg-amber-500' },
  { bg: 'bg-violet-100', border: 'border-l-violet-500', text: 'text-violet-700', dot: 'bg-violet-500' },
  { bg: 'bg-teal-100', border: 'border-l-teal-500', text: 'text-teal-700', dot: 'bg-teal-500' },
];

interface SessionDetailModalProps {
  session: Session | null;
  onClose: () => void;
}

function SessionDetailModal({ session, onClose }: SessionDetailModalProps) {
  const [materials, setMaterials] = useState<SessionMaterial[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [showReplayPlayer, setShowReplayPlayer] = useState(false);

  useEffect(() => {
    if (session) {
      fetchMaterials();
    }
  }, [session?.id]);

  const fetchMaterials = async () => {
    if (!session) return;
    try {
      setLoadingMaterials(true);
      const data = await materialsApi.getBySession(session.id);
      setMaterials(data);
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoadingMaterials(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
        return <FileText size={18} className="text-red-500" />;
      case 'image':
        return <ImageIcon size={18} className="text-blue-500" />;
      default:
        return <FileText size={18} className="text-gray-500" />;
    }
  };

  if (!session) return null;

  const now = new Date();
  const sessionStart = parseISO(session.scheduled_at);
  const sessionEnd = addHours(sessionStart, session.duration_minutes / 60);
  const canJoinFrom = addHours(sessionStart, -0.25);
  const zoomLink = session.class?.zoom_link;
  const canJoin = zoomLink && isAfter(now, canJoinFrom) && isBefore(now, sessionEnd);

  const getStatusLabel = () => {
    if (session.status === 'cancelled') return { text: 'Annule', color: 'bg-red-100 text-red-600' };
    if (session.status === 'completed' || isAfter(now, sessionEnd)) return { text: 'Termine', color: 'bg-gray-100 text-gray-600' };
    if (isAfter(now, sessionStart) && isBefore(now, sessionEnd)) return { text: 'En cours', color: 'bg-green-100 text-green-600' };
    return { text: 'A venir', color: 'bg-blue-100 text-blue-600' };
  };

  const status = getStatusLabel();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl md:rounded-xl w-full md:max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white p-4 md:p-6 border-b border-gray-100 z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg md:text-xl font-semibold text-secondary line-clamp-2">{session.title}</h2>
              <p className="text-sm text-gray-500 mt-1 truncate">{session.class?.program?.name}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors flex-shrink-0">
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 space-y-5 md:space-y-6">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 text-sm rounded-full ${status.color}`}>
              {status.text}
            </span>
          </div>

          {/* Date & Time */}
          <div className="space-y-2 md:space-y-3">
            <div className="flex items-center gap-3 text-secondary">
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm md:text-base">{format(sessionStart, 'EEEE d MMMM yyyy', { locale: fr })}</span>
            </div>
            <div className="flex items-center gap-3 text-secondary">
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm md:text-base">
                {format(sessionStart, 'HH:mm', { locale: fr })} - {format(sessionEnd, 'HH:mm', { locale: fr })}
                <span className="text-gray-400 ml-2">({session.duration_minutes} min)</span>
              </span>
            </div>
          </div>

          {/* Description */}
          {session.description && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
              <p className="text-secondary text-sm md:text-base">{session.description}</p>
            </div>
          )}

          {/* Teacher Info */}
          {session.teacher && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Enseignant</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-medium text-sm">
                    {session.teacher.teacher_profile?.first_name?.[0] || 'P'}
                    {session.teacher.teacher_profile?.last_name?.[0] || ''}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-secondary text-sm md:text-base truncate">
                    {session.teacher.teacher_profile?.first_name} {session.teacher.teacher_profile?.last_name}
                  </p>
                  <p className="text-xs md:text-sm text-gray-500 truncate">{session.teacher.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Zoom Meeting */}
          {zoomLink && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4">
              <div className="flex items-center gap-2 mb-3">
                <Video size={18} className="text-blue-600" />
                <p className="font-medium text-blue-900">Zoom</p>
                {session.class?.zoom_link && (
                  <span className="text-[10px] bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded">
                    Classe
                  </span>
                )}
              </div>
              <a
                href={zoomLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium min-h-[44px] ${
                  canJoin
                    ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                <Video size={16} />
                <span>{canJoin ? 'Rejoindre maintenant' : 'Lien Zoom'}</span>
              </a>
              {!canJoin && (
                <p className="text-xs text-blue-600 mt-2">
                  Disponible 15 min avant le cours
                </p>
              )}
            </div>
          )}

          {/* Supports de cours */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Supports de cours</h3>
            {loadingMaterials ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 size={24} className="animate-spin text-primary" />
              </div>
            ) : materials.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 text-center">
                  Aucun support disponible pour cette session
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {materials.map((material) => (
                  <div
                    key={material.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {getFileIcon(material.file_type)}
                      <div className="min-w-0">
                        <p className="font-medium text-gray-700 text-sm truncate">{material.title}</p>
                        <p className="text-xs text-gray-500">
                          {materialsApi.formatFileSize(material.file_size)}
                        </p>
                      </div>
                    </div>
                    <a
                      href={materialsApi.getFileUrl(material.file_path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 text-primary hover:bg-primary/10 active:bg-primary/20 rounded-lg transition-colors flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title="Telecharger"
                    >
                      <Download size={18} />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section Replay */}
          {session.replay_url && session.replay_valid && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Replay du cours</h3>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 md:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
                      <Play size={18} className="text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-purple-900 text-sm">Replay disponible</p>
                      {session.replay_expires_at && (
                        <p className="text-xs text-purple-700">
                          Jusqu&apos;au {format(new Date(session.replay_expires_at), 'dd/MM/yyyy', { locale: fr })}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowReplayPlayer(true)}
                    className="px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 active:bg-purple-800 transition-colors flex items-center justify-center gap-2 text-sm min-h-[44px] w-full sm:w-auto"
                  >
                    <Play size={16} />
                    Regarder
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white p-4 md:p-6 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 border border-gray-200 text-secondary rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[48px]"
          >
            Fermer
          </button>
        </div>
      </div>

      {/* Replay Player Pop-in */}
      {showReplayPlayer && session.replay_url && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-2 md:p-4"
          onClick={() => setShowReplayPlayer(false)}
        >
          <div
            className="relative bg-black rounded-xl max-w-4xl w-full"
            onClick={e => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowReplayPlayer(false)}
              className="absolute -top-10 md:-top-12 right-0 p-2 text-white hover:text-gray-300 transition-colors"
            >
              <X size={24} />
            </button>

            {/* Video Title */}
            <div className="absolute -top-10 md:-top-12 left-0 text-white">
              <h3 className="font-medium text-sm md:text-base truncate max-w-[200px] md:max-w-none">{session.title}</h3>
            </div>

            {/* Vimeo Iframe */}
            <div className="aspect-video">
              <iframe
                src={session.replay_url}
                className="w-full h-full rounded-xl"
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title={`Replay - ${session.title}`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StudentPlanning() {
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'week' | 'list'>('list');
  const [filterClass, setFilterClass] = useState<number | 'all'>('all');

  // Mapping classe -> couleur basé sur les inscriptions
  const classColorMap = useMemo(() => {
    const map: Record<number, typeof CLASS_COLORS[0]> = {};
    enrollments.forEach((enrollment, index) => {
      if (enrollment.class_id) {
        map[enrollment.class_id] = CLASS_COLORS[index % CLASS_COLORS.length];
      }
    });
    return map;
  }, [enrollments]);

  // Detecter si on est sur mobile pour le mode par defaut
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    setViewMode(isMobile ? 'list' : 'calendar');
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Ouvrir automatiquement la modale si un ID de session est dans l'URL
    const sessionId = searchParams.get('session');
    if (sessionId && sessions.length > 0) {
      const session = sessions.find(s => s.id === parseInt(sessionId));
      if (session) {
        setSelectedSession(session);
      }
    }
  }, [searchParams, sessions]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError('');

      const [enrollmentsData, sessionsData] = await Promise.all([
        enrollmentsApi.getMyEnrollments(),
        sessionsApi.getAll({ per_page: 500 })
      ]);

      setEnrollments(enrollmentsData.filter(e => e.status === 'active'));
      setSessions(sessionsData.data || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des donnees';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredSessions = useCallback(() => {
    // Dédupliquer par class_id + scheduled_at (les doublons en BDD ont des IDs différents mais même date/classe)
    const sessionMap = new Map<string, Session>();
    sessions.forEach(session => {
      const key = `${session.class_id}-${session.scheduled_at}`;
      if (!sessionMap.has(key)) {
        sessionMap.set(key, session);
      }
    });
    const uniqueSessions = Array.from(sessionMap.values());

    if (filterClass === 'all') return uniqueSessions;
    return uniqueSessions.filter(s => s.class_id === filterClass);
  }, [sessions, filterClass]);

  const getSessionsForDate = useCallback((date: Date) => {
    return getFilteredSessions().filter(session =>
      isSameDay(parseISO(session.scheduled_at), date)
    );
  }, [getFilteredSessions]);

  // Obtenir la couleur d'une session (custom > classe)
  const getSessionColor = useCallback((session: Session) => {
    if (session.color) {
      return {
        bg: '', border: '', text: '', dot: '',
        custom: session.color,
      };
    }
    return { ...(classColorMap[session.class_id] || CLASS_COLORS[0]), custom: undefined as string | undefined };
  }, [classColorMap]);

  // Obtenir le titre à afficher (titre custom > nom de classe)
  const getSessionDisplayTitle = useCallback((session: Session) => {
    return session.title && session.title !== `Session automatique de ${session.class?.program?.name || ''}`
      ? session.title
      : session.class?.name || session.title;
  }, []);

  // Obtenir la couleur simple pour les statuts (utilisée dans la liste)
  const getStatusColor = (session: Session) => {
    const now = new Date();
    const sessionStart = parseISO(session.scheduled_at);
    const sessionEnd = addHours(sessionStart, session.duration_minutes / 60);

    if (session.status === 'cancelled') return 'bg-red-500';
    if (session.status === 'completed' || isAfter(now, sessionEnd)) return 'bg-gray-400';
    if (isAfter(now, sessionStart) && isBefore(now, sessionEnd)) return 'bg-green-500';
    return 'bg-primary';
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const weeks = Math.ceil(days.length / 7);

    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Calendar Header */}
        <div className="p-3 md:p-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <button
            onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
            className="p-2 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-base md:text-lg font-bold text-slate-800 capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: fr })}
          </h2>
          <button
            onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
            className="p-2 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b border-slate-200">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
            <div key={i} className="py-3 bg-white border-r border-slate-100 text-center">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] md:hidden">{day}</span>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] hidden md:inline">{['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][i]}</span>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7" style={{ gridTemplateRows: `repeat(${weeks}, minmax(80px, 1fr))` }}>
          {days.map((day, index) => {
            const daySessions = getSessionsForDate(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isDayToday = isToday(day);

            return (
              <div
                key={index}
                className={`border-b border-r border-slate-100 p-1.5 md:p-2 transition-all flex flex-col min-h-0 overflow-hidden ${
                  !isCurrentMonth ? 'bg-slate-50/50' : 'bg-white'
                }`}
              >
                {/* Day header with number and session count */}
                <div className="flex justify-between items-center mb-1 shrink-0">
                  <span
                    className={`text-xs md:text-sm font-medium w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full transition-colors ${
                      isDayToday
                        ? 'bg-primary text-white'
                        : !isCurrentMonth
                        ? 'text-slate-300'
                        : 'text-slate-600'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  {daySessions.length > 0 && (
                    <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden md:inline">
                      {daySessions.length} séance{daySessions.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Sessions */}
                <div className="space-y-1 overflow-hidden flex-1 min-h-0">
                  {/* Mobile: colored dots */}
                  <div className="md:hidden flex flex-wrap gap-0.5 justify-center">
                    {daySessions.slice(0, 4).map(session => {
                      const colors = getSessionColor(session);
                      return (
                        <button
                          key={session.id}
                          onClick={() => setSelectedSession(session)}
                          className={`w-2.5 h-2.5 rounded-full ${colors.custom ? '' : colors.dot}`}
                          style={colors.custom ? { backgroundColor: colors.custom } : undefined}
                        />
                      );
                    })}
                    {daySessions.length > 4 && (
                      <span className="text-[10px] text-slate-500">+{daySessions.length - 4}</span>
                    )}
                  </div>

                  {/* Desktop: styled session items */}
                  <div className="hidden md:block space-y-1">
                    {daySessions.slice(0, 3).map(session => {
                      const colors = getSessionColor(session);
                      const hasZoom = session.class?.zoom_link;
                      return (
                        <button
                          key={session.id}
                          onClick={() => setSelectedSession(session)}
                          className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md border-l-2 hover:shadow-sm transition-shadow cursor-pointer text-left ${
                            colors.custom ? '' : `${colors.bg} ${colors.border}`
                          }`}
                          style={colors.custom ? {
                            backgroundColor: `${colors.custom}20`,
                            borderLeftColor: colors.custom,
                          } : undefined}
                        >
                          <span className="text-[11px] font-semibold text-slate-500">
                            {format(parseISO(session.scheduled_at), 'HH:mm')}
                          </span>
                          <span
                            className={`text-[11px] font-medium truncate flex-1 ${colors.custom ? '' : colors.text}`}
                            style={colors.custom ? { color: colors.custom } : undefined}
                          >
                            {getSessionDisplayTitle(session)}
                          </span>
                          {hasZoom && (
                            <Video size={12} className="text-blue-500 flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                    {daySessions.length > 3 && (
                      <div className="text-[10px] text-slate-400 pl-2 font-medium">
                        + {daySessions.length - 3} autre{daySessions.length > 4 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Vue semaine avec positionnement absolu (évite la duplication)
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentMonth, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
    const hours = Array.from({ length: 13 }, (_, i) => i + 11); // 11h à 23h
    const specialBlockPercent = 6;
    const hourPercent = (100 - specialBlockPercent) / hours.length;

    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col" style={{ minHeight: '600px' }}>
        {/* Navigation header */}
        <div className="p-3 md:p-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <button
            onClick={() => setCurrentMonth(prev => addDays(prev, -7))}
            className="p-2 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-base md:text-lg font-bold text-slate-800">
            Semaine du {format(weekStart, 'd MMM', { locale: fr })}
          </h2>
          <button
            onClick={() => setCurrentMonth(prev => addDays(prev, 7))}
            className="p-2 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Header avec jours */}
        <div className="flex border-b border-slate-200 shrink-0 bg-white">
          <div className="w-12 md:w-14 flex-shrink-0 py-2 border-r border-slate-100 text-center">
            <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase">Heure</span>
          </div>
          {days.map(day => (
            <div
              key={day.toISOString()}
              className={`flex-1 py-2 border-r border-slate-100 text-center ${
                isToday(day) ? 'bg-primary/5' : ''
              }`}
            >
              <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {format(day, 'EEE', { locale: fr })}.
              </span>
              <span
                className={`text-sm md:text-base font-bold ${
                  isToday(day) ? 'text-primary' : 'text-slate-700'
                }`}
              >
                {format(day, 'd')}
              </span>
            </div>
          ))}
        </div>

        {/* Grille */}
        <div className="flex-1 flex overflow-hidden">
          {/* Colonne des heures */}
          <div className="w-12 md:w-14 flex-shrink-0 border-r border-slate-100 flex flex-col">
            {/* Bloc spécial pour avant 11h */}
            <div style={{ height: `${specialBlockPercent}%` }} className="px-1 text-right border-b border-slate-200 bg-slate-50 flex items-center justify-end shrink-0">
              <span className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase">
                Spécial
              </span>
            </div>
            <div className="flex-1 flex flex-col">
              {hours.map(hour => (
                <div key={hour} style={{ flex: 1 }} className="px-1 text-right border-b border-slate-100 flex items-start justify-end">
                  <span className="text-[9px] md:text-[10px] font-medium text-slate-400 -mt-1.5">
                    {hour.toString().padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Colonnes des jours */}
          {days.map(day => {
            const daySessions = getSessionsForDate(day);
            const specialSessions = daySessions.filter(s => parseISO(s.scheduled_at).getHours() < 11);
            const regularSessions = daySessions.filter(s => parseISO(s.scheduled_at).getHours() >= 11);

            return (
              <div
                key={day.toISOString()}
                className={`flex-1 relative border-r border-slate-100 flex flex-col ${
                  isToday(day) ? 'bg-primary/5' : ''
                }`}
              >
                {/* Bloc spécial */}
                <div style={{ height: `${specialBlockPercent}%` }} className="border-b border-slate-200 bg-slate-50/50 p-0.5 overflow-hidden shrink-0">
                  {specialSessions.map(session => {
                    const colors = getSessionColor(session);
                    const sessionStart = parseISO(session.scheduled_at);
                    const hasZoom = session.class?.zoom_link;
                    return (
                      <div
                        key={session.id}
                        onClick={() => setSelectedSession(session)}
                        className={`px-1 py-0.5 rounded text-[8px] md:text-[9px] cursor-pointer hover:shadow-sm truncate ${
                          colors.custom ? '' : `${colors.bg} ${colors.text}`
                        }`}
                        style={colors.custom ? {
                          backgroundColor: `${colors.custom}20`,
                          color: colors.custom,
                        } : undefined}
                      >
                        {format(sessionStart, 'HH:mm')}
                        <span className="hidden md:inline"> {getSessionDisplayTitle(session)}</span>
                        {hasZoom && <Video size={8} className="inline ml-1 text-blue-500" />}
                      </div>
                    );
                  })}
                </div>

                {/* Grille horaire normale */}
                <div className="flex-1 flex flex-col relative">
                  {hours.map(hour => (
                    <div key={hour} style={{ flex: 1 }} className="border-b border-slate-100" />
                  ))}

                  {/* Sessions positionnées absolument (évite la duplication) */}
                  {regularSessions.map(session => {
                    const sessionStart = parseISO(session.scheduled_at);
                    const startHour = sessionStart.getHours();
                    const startMinutes = sessionStart.getMinutes();
                    const durationHours = session.duration_minutes / 60;

                    // Position en pourcentage
                    const topPercent = ((startHour - 11) + startMinutes / 60) * hourPercent;
                    const heightPercent = durationHours * hourPercent;

                    const colors = getSessionColor(session);
                    const hasZoom = session.class?.zoom_link;
                    const sessionEnd = addMinutes(sessionStart, session.duration_minutes);

                    return (
                      <div
                        key={session.id}
                        onClick={() => setSelectedSession(session)}
                        style={{
                          top: `${topPercent}%`,
                          height: `${Math.max(heightPercent - 0.3, 2)}%`,
                          ...(colors.custom ? {
                            backgroundColor: `${colors.custom}20`,
                            borderLeftColor: colors.custom,
                          } : {}),
                        }}
                        className={`absolute left-0.5 right-0.5 px-1 py-0.5 rounded border-l-2 cursor-pointer hover:shadow-md transition-shadow overflow-hidden z-10 ${
                          colors.custom ? '' : `${colors.bg} ${colors.border}`
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] md:text-[9px] font-bold text-slate-500">
                            {format(sessionStart, 'HH:mm')}-{format(sessionEnd, 'HH:mm')}
                          </span>
                          {hasZoom && <Video size={9} className="text-blue-500 hidden md:block" />}
                        </div>
                        <span
                          className={`text-[9px] md:text-[10px] font-medium truncate block ${colors.custom ? '' : colors.text}`}
                          style={colors.custom ? { color: colors.custom } : undefined}
                        >
                          {getSessionDisplayTitle(session)}
                        </span>
                        {heightPercent > 5 && session.class?.program?.name && (
                          <span className="text-[8px] md:text-[9px] text-slate-500 truncate block hidden md:block">
                            {session.class.program.name}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderListView = () => {
    const sortedSessions = [...getFilteredSessions()].sort(
      (a, b) => parseISO(a.scheduled_at).getTime() - parseISO(b.scheduled_at).getTime()
    );

    const now = new Date();
    const upcomingSessions = sortedSessions.filter(s => isAfter(parseISO(s.scheduled_at), addHours(now, -2)));
    const pastSessions = sortedSessions.filter(s => !isAfter(parseISO(s.scheduled_at), addHours(now, -2)));

    return (
      <div className="space-y-6 md:space-y-8">
        {/* Sessions a venir */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-3 md:p-4 border-b border-slate-200">
            <h2 className="text-base md:text-lg font-bold text-slate-800">Sessions à venir</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {upcomingSessions.length === 0 ? (
              <div className="p-6 md:p-8 text-center text-slate-500 text-sm md:text-base">
                Aucune session à venir
              </div>
            ) : (
              upcomingSessions.map(session => {
                const sessionStart = parseISO(session.scheduled_at);
                const sessionEnd = addHours(sessionStart, session.duration_minutes / 60);
                const colors = getSessionColor(session);
                // Utiliser le lien Zoom de la classe en priorité
                const sessionZoomLink = session.class?.zoom_link;
                const canJoin = sessionZoomLink &&
                  isAfter(now, addHours(sessionStart, -0.25)) &&
                  isBefore(now, sessionEnd);

                return (
                  <div
                    key={session.id}
                    className={`p-3 md:p-4 hover:bg-slate-50 active:bg-slate-100 cursor-pointer transition-colors border-l-4 ${
                      colors.custom ? '' : colors.border
                    }`}
                    style={colors.custom ? { borderLeftColor: colors.custom } : undefined}
                    onClick={() => setSelectedSession(session)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 md:gap-3">
                          <div
                            className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full flex-shrink-0 ${colors.custom ? '' : colors.dot}`}
                            style={colors.custom ? { backgroundColor: colors.custom } : undefined}
                          ></div>
                          <h3
                            className={`font-bold text-sm md:text-base capitalize ${colors.custom ? '' : colors.text}`}
                            style={colors.custom ? { color: colors.custom } : undefined}
                          >
                            <span className="hidden sm:inline">{format(sessionStart, 'EEEE d MMMM', { locale: fr })}</span>
                            <span className="sm:hidden">{format(sessionStart, 'EEE d MMM', { locale: fr })}</span>
                            <span className="mx-2">•</span>
                            <span>{format(sessionStart, 'HH:mm')} - {format(sessionEnd, 'HH:mm')}</span>
                          </h3>
                          {sessionZoomLink && (
                            <Video size={14} className="text-blue-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs md:text-sm text-slate-500 ml-5 md:ml-6 mt-0.5 md:mt-1 truncate">
                          {getSessionDisplayTitle(session)} • {session.class?.program?.name}
                        </p>
                      </div>
                      {canJoin && sessionZoomLink && (
                        <a
                          href={sessionZoomLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="flex items-center justify-center gap-2 px-3 md:px-4 py-2.5 bg-blue-600 text-white text-xs md:text-sm rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors min-h-[44px] w-full sm:w-auto"
                        >
                          <Video size={16} />
                          Rejoindre
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Sessions passees */}
        {pastSessions.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-3 md:p-4 border-b border-slate-200">
              <h2 className="text-base md:text-lg font-bold text-slate-800">Sessions passées</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {pastSessions.slice(0, 10).map(session => {
                const sessionStart = parseISO(session.scheduled_at);
                const sessionEnd = addHours(sessionStart, session.duration_minutes / 60);
                const colors = getSessionColor(session);

                return (
                  <div
                    key={session.id}
                    className={`p-3 md:p-4 hover:bg-slate-50 active:bg-slate-100 cursor-pointer transition-colors opacity-60 border-l-4 ${
                      colors.custom ? '' : colors.border
                    }`}
                    style={colors.custom ? { borderLeftColor: colors.custom } : undefined}
                    onClick={() => setSelectedSession(session)}
                  >
                    <div className="flex items-center gap-2 md:gap-3">
                      <div
                        className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full flex-shrink-0 ${colors.custom ? '' : colors.dot}`}
                        style={colors.custom ? { backgroundColor: colors.custom } : undefined}
                      ></div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-slate-700 text-sm md:text-base capitalize">
                          <span className="hidden sm:inline">{format(sessionStart, 'EEEE d MMMM', { locale: fr })}</span>
                          <span className="sm:hidden">{format(sessionStart, 'EEE d MMM', { locale: fr })}</span>
                          <span className="mx-2">•</span>
                          <span>{format(sessionStart, 'HH:mm')} - {format(sessionEnd, 'HH:mm')}</span>
                        </h3>
                        <p className="text-xs md:text-sm text-slate-500 truncate">
                          {getSessionDisplayTitle(session)} • {session.class?.program?.name}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3 md:w-1/4"></div>
          <div className="h-64 md:h-96 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-4 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-playfair font-semibold text-secondary">Planning</h1>
        <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">Consultez vos sessions et rejoignez vos cours</p>
      </div>

      {error && (
        <div className="mb-4 md:mb-6 p-3 md:p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Filters & View Toggle */}
      <div className="mb-4 md:mb-6 flex flex-col sm:flex-row gap-3 md:gap-4 items-stretch sm:items-center justify-between">
        {/* Class Filter */}
        <select
          value={filterClass === 'all' ? 'all' : filterClass}
          onChange={e => setFilterClass(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
          className="px-3 md:px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[44px]"
        >
          <option value="all">Toutes les classes</option>
          {enrollments.map(enrollment => (
            <option key={enrollment.class_id} value={enrollment.class_id}>
              {enrollment.class?.program?.name} - {enrollment.class?.name}
            </option>
          ))}
        </select>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-2.5 md:px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[40px] ${
              viewMode === 'list' ? 'bg-white shadow-sm text-secondary' : 'text-gray-500 hover:text-secondary'
            }`}
          >
            <List size={16} />
            <span className="hidden sm:inline">Liste</span>
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`flex items-center gap-1.5 px-2.5 md:px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[40px] ${
              viewMode === 'week' ? 'bg-white shadow-sm text-secondary' : 'text-gray-500 hover:text-secondary'
            }`}
          >
            <Calendar size={16} />
            <span className="hidden sm:inline">Semaine</span>
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1.5 px-2.5 md:px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[40px] ${
              viewMode === 'calendar' ? 'bg-white shadow-sm text-secondary' : 'text-gray-500 hover:text-secondary'
            }`}
          >
            <Calendar size={16} />
            <span className="hidden sm:inline">Mois</span>
          </button>
        </div>
      </div>

      {/* Legend - Classes */}
      {enrollments.length > 0 && (
        <div className="mb-4 md:mb-6 p-3 md:p-4 bg-white rounded-xl shadow-sm border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
            Mes classes
          </p>
          <div className="flex flex-wrap gap-3 md:gap-4">
            {enrollments.map(enrollment => {
              const colors = classColorMap[enrollment.class_id!];
              if (!colors) return null;
              return (
                <div key={enrollment.class_id} className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full ${colors.dot}`}></div>
                  <span className="text-xs md:text-sm text-slate-600 truncate max-w-[150px] md:max-w-none">
                    {enrollment.class?.name || enrollment.class?.program?.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Content */}
      {viewMode === 'calendar' && renderCalendar()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'list' && renderListView()}

      {/* Session Detail Modal */}
      <SessionDetailModal
        session={selectedSession}
        onClose={() => setSelectedSession(null)}
      />
    </div>
  );
}
