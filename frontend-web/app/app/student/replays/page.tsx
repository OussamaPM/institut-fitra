'use client';

import { useEffect, useState } from 'react';
import { sessionsApi } from '@/lib/api';
import { Session } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Play, X, Calendar, BookOpen, Clock, Search } from 'lucide-react';

export default function StudentReplays() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadReplays();
  }, []);

  const loadReplays = async () => {
    try {
      setIsLoading(true);
      setError('');
      const sessionsData = await sessionsApi.getAll({ per_page: 500 });
      // Filter only sessions with valid replays
      const replays = (sessionsData.data || []).filter(
        (s) => s.replay_url && s.replay_valid
      );
      setSessions(replays);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des replays';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSessions = sessions.filter((session) => {
    const matchesSearch =
      searchTerm === '' ||
      session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.class?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.class?.program?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Group sessions by program
  const sessionsByProgram = filteredSessions.reduce((acc, session) => {
    const programName = session.class?.program?.name || 'Autre';
    if (!acc[programName]) {
      acc[programName] = [];
    }
    acc[programName].push(session);
    return acc;
  }, {} as Record<string, Session[]>);

  if (isLoading) {
    return (
      <div className="p-4 md:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3 md:w-1/4"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 md:h-48 bg-gray-200 rounded-xl"></div>
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
        <h1 className="text-2xl md:text-3xl font-playfair font-semibold text-secondary">Replays</h1>
        <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">Revoyez vos cours en replay</p>
      </div>

      {error && (
        <div className="mb-4 md:mb-6 p-3 md:p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="mb-4 md:mb-6">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un replay..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[44px]"
          />
        </div>
      </div>

      {/* Content */}
      {filteredSessions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 md:p-12 text-center">
          <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Play size={28} className="text-gray-400" />
          </div>
          <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">Aucun replay disponible</h3>
          <p className="text-gray-500 text-sm md:text-base">
            {searchTerm
              ? 'Aucun replay ne correspond a votre recherche'
              : 'Les replays de vos cours apparaitront ici une fois disponibles'}
          </p>
        </div>
      ) : (
        <div className="space-y-6 md:space-y-8">
          {Object.entries(sessionsByProgram).map(([programName, programSessions]) => (
            <div key={programName}>
              <h2 className="text-base md:text-lg font-semibold text-secondary mb-3 md:mb-4 flex items-center gap-2">
                <BookOpen size={18} className="text-primary" />
                {programName}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {programSessions.map((session) => (
                  <div
                    key={session.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md active:bg-gray-50 transition-all cursor-pointer"
                    onClick={() => setSelectedSession(session)}
                  >
                    {/* Thumbnail Placeholder */}
                    <div className="relative bg-gradient-to-br from-purple-500 to-purple-700 h-28 md:h-32 flex items-center justify-center">
                      <div className="absolute inset-0 bg-black/20"></div>
                      <div className="relative z-10 w-12 h-12 md:w-14 md:h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <Play size={24} className="text-white ml-1" />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3 md:p-4">
                      <h3 className="font-medium text-secondary text-sm md:text-base mb-2 line-clamp-2">
                        {session.title}
                      </h3>
                      <div className="space-y-1 text-xs md:text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <Calendar size={13} className="flex-shrink-0" />
                          <span className="truncate">
                            <span className="hidden sm:inline">{format(parseISO(session.scheduled_at), 'EEEE d MMMM yyyy', { locale: fr })}</span>
                            <span className="sm:hidden">{format(parseISO(session.scheduled_at), 'd MMM yyyy', { locale: fr })}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={13} className="flex-shrink-0" />
                          <span>{session.duration_minutes} min</span>
                        </div>
                      </div>
                      {session.replay_expires_at && (
                        <div className="mt-2 md:mt-3 text-xs text-purple-600 bg-purple-50 rounded px-2 py-1 inline-block">
                          Jusqu&apos;au {format(new Date(session.replay_expires_at), 'dd/MM/yyyy')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Replay Player Modal */}
      {selectedSession && selectedSession.replay_url && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2 md:p-4"
          onClick={() => setSelectedSession(null)}
        >
          <div
            className="relative bg-black rounded-xl max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedSession(null)}
              className="absolute -top-10 md:-top-12 right-0 p-2 text-white hover:text-gray-300 transition-colors"
            >
              <X size={24} />
            </button>

            {/* Video Title */}
            <div className="absolute -top-10 md:-top-12 left-0 text-white">
              <h3 className="font-medium text-sm md:text-base truncate max-w-[200px] md:max-w-none">{selectedSession.title}</h3>
              <p className="text-xs md:text-sm text-gray-400 hidden md:block">
                {format(parseISO(selectedSession.scheduled_at), 'EEEE d MMMM yyyy', { locale: fr })}
              </p>
            </div>

            {/* Vimeo Iframe */}
            <div className="aspect-video">
              <iframe
                src={selectedSession.replay_url}
                className="w-full h-full rounded-xl"
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title={`Replay - ${selectedSession.title}`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
