'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
  addMinutes,
  isToday,
  startOfDay,
  addDays,
  getDay,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { Session, ClassModel } from '@/lib/types';
import sessionsApi from '@/lib/api/sessions';
import classesApi from '@/lib/api/classes';
import { Button } from '@/components/ui';
import {
  Plus,
  Filter,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Video,
  Users,
  X,
} from 'lucide-react';
import SessionFormModal from './SessionFormModal';
import SessionDetailModal from './SessionDetailModal';

type ViewType = 'month' | 'week' | 'day';

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

// Couleurs par statut
const STATUS_COLORS = {
  scheduled: { bg: 'bg-primary/10', border: 'border-l-primary', text: 'text-primary', dot: 'bg-primary' },
  in_progress: { bg: 'bg-yellow-100', border: 'border-l-yellow-500', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  completed: { bg: 'bg-green-100', border: 'border-l-green-500', text: 'text-green-700', dot: 'bg-green-500' },
  cancelled: { bg: 'bg-red-100', border: 'border-l-red-500', text: 'text-red-700', dot: 'bg-red-500' },
};

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [classes, setClasses] = useState<ClassModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('month');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [editingSession, setEditingSession] = useState<Session | null>(null);

  // Filters
  const [filterClassId, setFilterClassId] = useState<number | undefined>();
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [showFilters, setShowFilters] = useState(false);

  // Mapping classe -> couleur
  const classColorMap = useMemo(() => {
    const map: Record<number, typeof CLASS_COLORS[0]> = {};
    classes.forEach((cls, index) => {
      map[cls.id] = CLASS_COLORS[index % CLASS_COLORS.length];
    });
    return map;
  }, [classes]);

  const isInitialLoad = useRef(true);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await sessionsApi.getAllTeacher({
        page: 1,
        per_page: 1000,
      });

      const sessionsData = response.data || [];
      setSessions(sessionsData);

      // Auto-navigate to first session's month only on initial load
      if (isInitialLoad.current && sessionsData.length > 0) {
        const firstSessionDate = parseISO(sessionsData[0].scheduled_at);
        setCurrentDate(firstSessionDate);
        setSelectedDate(firstSessionDate);
        isInitialLoad.current = false;
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await classesApi.getAll({ page: 1, per_page: 100 });
      setClasses(response.data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchClasses();
  }, [fetchSessions]);

  // Filtrer les sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      if (filterClassId && session.class_id !== filterClassId) return false;
      if (filterStatus && session.status !== filterStatus) return false;
      return true;
    });
  }, [sessions, filterClassId, filterStatus]);

  // Sessions pour une date donnée
  const getSessionsForDate = useCallback(
    (date: Date) => {
      return filteredSessions.filter(session =>
        isSameDay(parseISO(session.scheduled_at), date)
      );
    },
    [filteredSessions]
  );

  // Sessions du jour sélectionné
  const selectedDateSessions = useMemo(() => {
    return getSessionsForDate(selectedDate).sort((a, b) =>
      parseISO(a.scheduled_at).getTime() - parseISO(b.scheduled_at).getTime()
    );
  }, [selectedDate, getSessionsForDate]);

  // Navigation
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const goToPrevious = () => {
    if (view === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (view === 'week') {
      setCurrentDate(addDays(currentDate, -7));
    } else {
      setCurrentDate(addDays(currentDate, -1));
    }
  };

  const goToNext = () => {
    if (view === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (view === 'week') {
      setCurrentDate(addDays(currentDate, 7));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  // Handlers
  const handleSelectEvent = (session: Session) => {
    setSelectedSession(session);
    setIsDetailModalOpen(true);
  };

  const handleCreateSession = () => {
    setEditingSession(null);
    setIsFormModalOpen(true);
  };

  const handleEditSession = (session: Session) => {
    setEditingSession(session);
    setIsFormModalOpen(true);
    setIsDetailModalOpen(false);
  };

  const handleDeleteSession = async (sessionId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette session ?')) return;

    try {
      await sessionsApi.delete(sessionId);
      await fetchSessions();
      setIsDetailModalOpen(false);
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Erreur lors de la suppression de la session');
    }
  };

  const handleFormSuccess = () => {
    setIsFormModalOpen(false);
    setEditingSession(null);
    fetchSessions();
    fetchClasses();
  };

  // Obtenir la couleur d'une session (custom > classe)
  const getSessionColor = (session: Session) => {
    if (session.color) {
      return {
        bg: '',
        border: '',
        text: '',
        dot: '',
        custom: session.color,
      };
    }
    return { ...(classColorMap[session.class_id] || CLASS_COLORS[0]), custom: undefined as string | undefined };
  };

  // Obtenir le titre à afficher (titre custom > nom de classe)
  const getSessionDisplayTitle = (session: Session) => {
    return session.title && session.title !== `Session automatique de ${session.class?.program?.name || ''}`
      ? session.title
      : session.class?.name || session.title;
  };

  // Générer les jours du mois
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const daysOfWeek = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const weeks = Math.ceil(days.length / 7);

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header des jours */}
        <div className="grid grid-cols-7 border-b border-slate-200 shrink-0">
          {daysOfWeek.map(day => (
            <div
              key={day}
              className="py-3 bg-white border-r border-slate-100 text-center"
            >
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em]">
                {day}
              </span>
            </div>
          ))}
        </div>

        {/* Grille des jours - prend tout l'espace disponible */}
        <div className="flex-1 grid grid-cols-7 overflow-auto" style={{ gridTemplateRows: `repeat(${weeks}, minmax(0, 1fr))` }}>
          {days.map((day, index) => {
            const daySessions = getSessionsForDate(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isSelected = isSameDay(day, selectedDate);
            const isDayToday = isToday(day);

            return (
              <div
                key={index}
                onClick={() => setSelectedDate(day)}
                className={`border-b border-r border-slate-100 p-2 transition-all cursor-pointer group flex flex-col min-h-0 overflow-hidden ${
                  !isCurrentMonth ? 'bg-slate-50/50' : 'bg-white hover:bg-slate-50'
                } ${isSelected ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' : ''}`}
              >
                <div className="flex justify-between items-center mb-1 shrink-0">
                  <span
                    className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
                      isDayToday
                        ? 'bg-primary text-white'
                        : isSelected
                        ? 'bg-primary/10 text-primary'
                        : !isCurrentMonth
                        ? 'text-slate-300'
                        : 'text-slate-600 group-hover:text-primary'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  {daySessions.length > 0 && (
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {daySessions.length} séance{daySessions.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="space-y-1 overflow-hidden flex-1 min-h-0">
                  {daySessions.slice(0, 3).map(session => {
                    const colors = getSessionColor(session);
                    const hasZoom = session.class?.zoom_link;
                    return (
                      <div
                        key={session.id}
                        onClick={e => {
                          e.stopPropagation();
                          handleSelectEvent(session);
                        }}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md border-l-2 hover:shadow-sm transition-shadow cursor-pointer ${
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
                      </div>
                    );
                  })}
                  {daySessions.length > 3 && (
                    <div className="text-[10px] text-slate-400 pl-2 font-medium">
                      + {daySessions.length - 3} autre{daySessions.length > 4 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Vue semaine
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
    const hours = Array.from({ length: 13 }, (_, i) => i + 11); // 11h à 23h
    // Utiliser des pourcentages pour que la grille prenne toute la hauteur disponible
    const specialBlockPercent = 6; // % pour le bloc spécial
    const hourPercent = (100 - specialBlockPercent) / hours.length; // % par heure

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header avec jours */}
        <div className="flex border-b border-slate-200 shrink-0 bg-white z-10">
          <div className="w-14 flex-shrink-0 py-2 border-r border-slate-100 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Heure</span>
          </div>
          {days.map(day => (
            <div
              key={day.toISOString()}
              onClick={() => setSelectedDate(day)}
              className={`flex-1 py-2 border-r border-slate-100 text-center cursor-pointer hover:bg-slate-50 ${
                isSameDay(day, selectedDate) ? 'bg-primary/5' : ''
              }`}
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {format(day, 'EEE', { locale: fr })}.
              </span>
              <span
                className={`text-base font-bold ${
                  isToday(day) ? 'text-primary' : 'text-slate-700'
                }`}
              >
                {format(day, 'd')}
              </span>
            </div>
          ))}
        </div>

        {/* Grille - prend tout l'espace disponible */}
        <div className="flex-1 flex overflow-hidden">
          {/* Colonne des heures */}
          <div className="w-14 flex-shrink-0 border-r border-slate-100 flex flex-col">
            {/* Bloc spécial pour avant 11h */}
            <div style={{ height: `${specialBlockPercent}%` }} className="px-1 text-right border-b border-slate-200 bg-slate-50 flex items-center justify-end shrink-0">
              <span className="text-[9px] font-bold text-slate-500 uppercase">
                Spécial
              </span>
            </div>
            <div className="flex-1 flex flex-col">
              {hours.map(hour => (
                <div key={hour} style={{ flex: 1 }} className="px-1 text-right border-b border-slate-100 flex items-start justify-end">
                  <span className="text-[10px] font-medium text-slate-400 -mt-1.5">
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
                  isSameDay(day, selectedDate) ? 'bg-primary/5' : ''
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
                        onClick={() => handleSelectEvent(session)}
                        className={`px-1 py-0.5 rounded text-[9px] cursor-pointer hover:shadow-sm truncate ${
                          colors.custom ? '' : `${colors.bg} ${colors.text}`
                        }`}
                        style={colors.custom ? {
                          backgroundColor: `${colors.custom}20`,
                          color: colors.custom,
                        } : undefined}
                      >
                        {format(sessionStart, 'HH:mm')} {getSessionDisplayTitle(session)}
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

                  {/* Sessions positionnées absolument */}
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
                        onClick={() => handleSelectEvent(session)}
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
                          <span className="text-[9px] font-bold text-slate-500">
                            {format(sessionStart, 'HH:mm')}-{format(sessionEnd, 'HH:mm')}
                          </span>
                          {hasZoom && <Video size={9} className="text-blue-500" />}
                        </div>
                        <span
                          className={`text-[10px] font-medium truncate block ${colors.custom ? '' : colors.text}`}
                          style={colors.custom ? { color: colors.custom } : undefined}
                        >
                          {getSessionDisplayTitle(session)}
                        </span>
                        {heightPercent > 5 && session.class?.program?.name && (
                          <span className="text-[9px] text-slate-500 truncate block">
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

  // Vue jour
  const renderDayView = () => {
    const hours = Array.from({ length: 13 }, (_, i) => i + 11); // 11h à 23h
    const daySessions = getSessionsForDate(currentDate);
    const hourHeight = 50; // pixels par heure (réduit)
    const specialBlockHeight = 50; // hauteur du bloc spécial

    const specialSessions = daySessions.filter(s => parseISO(s.scheduled_at).getHours() < 11);
    const regularSessions = daySessions.filter(s => parseISO(s.scheduled_at).getHours() >= 11);

    return (
      <div className="flex-1 overflow-auto">
        <div className="border-b border-slate-200 py-3 px-6 bg-white sticky top-0 z-10">
          <h3 className="text-lg font-bold text-slate-800 capitalize">
            {format(currentDate, 'EEEE d MMMM yyyy', { locale: fr })}
          </h3>
          <p className="text-sm text-slate-500">
            {daySessions.length} séance{daySessions.length > 1 ? 's' : ''} prévue{daySessions.length > 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex">
          {/* Colonne des heures */}
          <div className="w-20 flex-shrink-0 border-r border-slate-100">
            {/* Bloc spécial */}
            <div className="h-[50px] px-3 text-right border-b border-slate-200 bg-slate-50">
              <span className="text-[11px] font-bold text-slate-500 uppercase">
                Spécial
              </span>
            </div>
            {hours.map(hour => (
              <div key={hour} className="h-[50px] px-3 text-right border-b border-slate-100">
                <span className="text-sm font-medium text-slate-400">
                  {hour.toString().padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {/* Zone des sessions */}
          <div className="flex-1 relative">
            {/* Bloc spécial */}
            <div className="h-[50px] border-b border-slate-200 bg-slate-50/50 p-1 overflow-y-auto">
              {specialSessions.length === 0 ? (
                <p className="text-[10px] text-slate-400 italic">Aucun cours avant 11h</p>
              ) : (
                specialSessions.map(session => {
                  const colors = getSessionColor(session);
                  const sessionStart = parseISO(session.scheduled_at);
                  const sessionEnd = addMinutes(sessionStart, session.duration_minutes);
                  const hasZoom = session.class?.zoom_link;
                  return (
                    <div
                      key={session.id}
                      onClick={() => handleSelectEvent(session)}
                      className={`px-2 py-1 rounded border-l-2 cursor-pointer hover:shadow-sm mb-1 ${
                        colors.custom ? '' : `${colors.bg} ${colors.border}`
                      }`}
                      style={colors.custom ? {
                        backgroundColor: `${colors.custom}20`,
                        borderLeftColor: colors.custom,
                      } : undefined}
                    >
                      <span className="text-[10px] font-bold text-slate-500">
                        {format(sessionStart, 'HH:mm')} - {format(sessionEnd, 'HH:mm')}
                      </span>
                      <span
                        className={`text-[11px] font-medium ml-2 ${colors.custom ? '' : colors.text}`}
                        style={colors.custom ? { color: colors.custom } : undefined}
                      >
                        {getSessionDisplayTitle(session)}
                      </span>
                      {hasZoom && <Video size={10} className="inline ml-1 text-blue-500" />}
                    </div>
                  );
                })
              )}
            </div>

            {/* Grille horaire */}
            {hours.map(hour => (
              <div key={hour} className="h-[50px] border-b border-slate-100" />
            ))}

            {/* Sessions positionnées absolument */}
            {regularSessions.map(session => {
              const sessionStart = parseISO(session.scheduled_at);
              const startHour = sessionStart.getHours();
              const startMinutes = sessionStart.getMinutes();
              const durationHours = session.duration_minutes / 60;

              // Position depuis le haut (11h = 0, après le bloc spécial)
              const topOffset = specialBlockHeight + (startHour - 11) * hourHeight + (startMinutes / 60) * hourHeight;
              const height = durationHours * hourHeight;

              const colors = getSessionColor(session);
              const sessionEnd = addMinutes(sessionStart, session.duration_minutes);
              const hasZoom = session.class?.zoom_link;

              return (
                <div
                  key={session.id}
                  onClick={() => handleSelectEvent(session)}
                  style={{
                    top: `${topOffset}px`,
                    height: `${Math.max(height - 4, 24)}px`,
                    ...(colors.custom ? {
                      backgroundColor: `${colors.custom}20`,
                      borderLeftColor: colors.custom,
                    } : {}),
                  }}
                  className={`absolute left-2 right-2 p-2 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition-shadow overflow-hidden z-10 ${
                    colors.custom ? '' : `${colors.bg} ${colors.border}`
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4
                        className={`text-sm font-semibold truncate ${colors.custom ? '' : colors.text}`}
                        style={colors.custom ? { color: colors.custom } : undefined}
                      >
                        {getSessionDisplayTitle(session)}
                      </h4>
                      {height > 40 && session.class?.program?.name && (
                        <p className="text-xs text-slate-600 truncate">
                          {session.class.program.name}
                        </p>
                      )}
                    </div>
                    {hasZoom && (
                      <div className="p-1 bg-blue-100 rounded flex-shrink-0 ml-1">
                        <Video size={12} className="text-blue-600" />
                      </div>
                    )}
                  </div>
                  {height > 50 && (
                    <div className="flex items-center gap-3 mt-1 text-slate-500">
                      <div className="flex items-center gap-1 text-[11px]">
                        <Clock size={10} />
                        <span>
                          {format(sessionStart, 'HH:mm')} - {format(sessionEnd, 'HH:mm')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px]">
                        <Users size={10} />
                        <span>{session.duration_minutes} min</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="flex h-[calc(100vh-96px)] md:h-[calc(100vh-128px)] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Sidebar - Agenda du jour */}
        <div className="w-72 bg-white border-r border-slate-200 flex-col hidden lg:flex">
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary rounded-xl text-white">
                <CalendarIcon size={20} />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-secondary">Calendrier</h1>
            </div>

            <Button
              onClick={handleCreateSession}
              className="w-full flex items-center justify-center gap-2 shadow-lg"
            >
              <Plus size={18} />
              Nouvelle séance
            </Button>
          </div>

        {/* Sessions du jour sélectionné */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
            </h2>
            {isToday(selectedDate) && (
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full">
                Aujourd&apos;hui
              </span>
            )}
          </div>

          <div className="space-y-4">
            {selectedDateSessions.length === 0 ? (
              <p className="text-sm text-slate-400 italic text-center py-8">
                Aucune séance prévue ce jour.
              </p>
            ) : (
              selectedDateSessions.map(session => {
                const colors = getSessionColor(session);
                const sessionStart = parseISO(session.scheduled_at);
                const sessionEnd = addMinutes(sessionStart, session.duration_minutes);
                const hasZoom = session.class?.zoom_link;

                return (
                  <div
                    key={session.id}
                    onClick={() => handleSelectEvent(session)}
                    className={`group relative pl-4 border-l-2 hover:border-primary transition-colors cursor-pointer ${
                      colors.custom ? '' : colors.border
                    }`}
                    style={colors.custom ? { borderLeftColor: colors.custom } : undefined}
                  >
                    <p className="text-[11px] font-bold text-slate-400 mb-0.5">
                      {format(sessionStart, 'HH:mm')} - {format(sessionEnd, 'HH:mm')}
                    </p>
                    <h3
                      className="text-sm font-bold group-hover:text-primary transition-colors"
                      style={colors.custom ? { color: colors.custom } : { color: '#1e293b' }}
                    >
                      {getSessionDisplayTitle(session)}
                    </h3>
                    {session.class?.program?.name && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {session.class.program.name}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-slate-500">
                      <div className="flex items-center gap-1 text-[11px]">
                        <Clock size={12} />
                        <span>{session.duration_minutes} min</span>
                      </div>
                      {hasZoom && (
                        <div className="flex items-center gap-1 text-[11px] text-blue-500">
                          <Video size={12} />
                          <span>Zoom</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Légende */}
        <div className="p-4 border-t border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
            Légende
          </p>
          <div className="space-y-2">
            {classes.slice(0, 6).map(cls => {
              const colors = classColorMap[cls.id];
              if (!colors) return null;
              return (
                <div key={cls.id} className="flex items-center gap-2.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`}></div>
                  <span className="text-sm text-slate-600 truncate">{cls.name}</span>
                </div>
              );
            })}
            {classes.length > 6 && (
              <p className="text-xs text-slate-400 mt-2">+ {classes.length - 6} autres</p>
            )}
          </div>
        </div>
      </div>

      {/* Main Calendar Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 md:h-20 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 md:gap-4">
            <h2 className="text-lg md:text-2xl font-bold text-slate-800 capitalize">
              {view === 'month' && format(currentDate, 'MMMM yyyy', { locale: fr })}
              {view === 'week' && (
                <span className="hidden sm:inline">Semaine du {format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMMM', { locale: fr })}</span>
              )}
              {view === 'week' && (
                <span className="sm:hidden">{format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM', { locale: fr })}</span>
              )}
              {view === 'day' && format(currentDate, 'd MMMM yyyy', { locale: fr })}
            </h2>
            <div className="flex items-center bg-slate-100 p-1 rounded-lg">
              <button
                onClick={goToPrevious}
                className="p-1.5 hover:bg-white hover:shadow-sm rounded transition-all text-slate-600"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={goToToday}
                className="px-3 py-1 text-xs font-bold text-slate-600 hover:text-primary transition-colors hidden sm:block"
              >
                Aujourd&apos;hui
              </button>
              <button
                onClick={goToNext}
                className="p-1.5 hover:bg-white hover:shadow-sm rounded transition-all text-slate-600"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Bouton filtres (mobile) */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors lg:hidden ${
                showFilters || filterClassId || filterStatus
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Filter size={18} />
            </button>

            {/* Sélecteurs de vue */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              {(['day', 'week', 'month'] as ViewType[]).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 md:px-4 py-1.5 text-xs md:text-sm font-bold rounded-md transition-all ${
                    view === v
                      ? 'bg-white shadow-sm text-primary'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {v === 'day' && 'Jour'}
                  {v === 'week' && 'Semaine'}
                  {v === 'month' && 'Mois'}
                </button>
              ))}
            </div>

            {/* Filtres (desktop) */}
            <div className="hidden lg:flex items-center gap-2">
              <select
                value={filterClassId || ''}
                onChange={e => setFilterClassId(e.target.value ? Number(e.target.value) : undefined)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 max-w-[160px]"
              >
                <option value="">Toutes les classes</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus || ''}
                onChange={e => setFilterStatus(e.target.value || undefined)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Tous statuts</option>
                <option value="scheduled">Planifié</option>
                <option value="in_progress">En cours</option>
                <option value="completed">Terminé</option>
                <option value="cancelled">Annulé</option>
              </select>

              {(filterClassId || filterStatus) && (
                <button
                  onClick={() => {
                    setFilterClassId(undefined);
                    setFilterStatus(undefined);
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                  title="Réinitialiser les filtres"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Filtres mobile */}
        {showFilters && (
          <div className="lg:hidden bg-white border-b border-slate-200 p-3 flex gap-2">
            <select
              value={filterClassId || ''}
              onChange={e => setFilterClassId(e.target.value ? Number(e.target.value) : undefined)}
              className="flex-1 text-xs border border-slate-200 rounded px-2 py-1.5 bg-white"
            >
              <option value="">Toutes les classes</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>

            <select
              value={filterStatus || ''}
              onChange={e => setFilterStatus(e.target.value || undefined)}
              className="flex-1 text-xs border border-slate-200 rounded px-2 py-1.5 bg-white"
            >
              <option value="">Tous statuts</option>
              <option value="scheduled">Planifié</option>
              <option value="in_progress">En cours</option>
              <option value="completed">Terminé</option>
              <option value="cancelled">Annulé</option>
            </select>
          </div>
        )}

        {/* Calendar Grid */}
        <div className="flex-1 overflow-hidden flex flex-col bg-white">
          {view === 'month' && renderMonthView()}
          {view === 'week' && renderWeekView()}
          {view === 'day' && renderDayView()}
        </div>
      </div>

      {/* Modals */}
      {isFormModalOpen && (
        <SessionFormModal
          session={editingSession}
          classes={classes}
          onClose={() => {
            setIsFormModalOpen(false);
            setEditingSession(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {isDetailModalOpen && selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedSession(null);
          }}
          onEdit={handleEditSession}
          onDelete={handleDeleteSession}
          onUpdate={(updatedSession) => {
            setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
            setSelectedSession(updatedSession);
          }}
        />
      )}
      </div>
    </div>
  );
}
