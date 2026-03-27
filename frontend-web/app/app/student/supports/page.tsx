'use client';

import { useState, useEffect } from 'react';
import { SessionMaterial, Enrollment } from '@/lib/types';
import materialsApi from '@/lib/api/materials';
import { enrollmentsApi } from '@/lib/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  FileText,
  Image as ImageIcon,
  Download,
  Loader2,
  BookOpen,
  Calendar,
  Search,
  Filter,
  Play,
  X,
} from 'lucide-react';
import { Session } from '@/lib/types';

export default function StudentSupportsPage() {
  const [materials, setMaterials] = useState<SessionMaterial[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClassId, setFilterClassId] = useState<number | 'all'>('all');
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [materialsData, enrollmentsData] = await Promise.all([
        materialsApi.getStudentMaterials(),
        enrollmentsApi.getMyEnrollments(),
      ]);
      setMaterials(materialsData);
      setEnrollments(enrollmentsData.filter(e => e.status === 'active'));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
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

  // Filtrer les supports
  const filteredMaterials = materials.filter((material) => {
    const matchesSearch =
      searchTerm === '' ||
      material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.session?.title?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesClass =
      filterClassId === 'all' || material.session?.class_id === filterClassId;

    return matchesSearch && matchesClass;
  });

  // Grouper par date de session (les plus recentes en premier)
  const sortedMaterials = [...filteredMaterials].sort((a, b) => {
    const dateA = a.session?.scheduled_at ? new Date(a.session.scheduled_at).getTime() : 0;
    const dateB = b.session?.scheduled_at ? new Date(b.session.scheduled_at).getTime() : 0;
    return dateB - dateA;
  });

  if (loading) {
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
        <h1 className="text-2xl md:text-3xl font-playfair font-semibold text-secondary">Supports de cours</h1>
        <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">
          Telechargez les supports de cours mis a disposition par vos enseignants
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 md:p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 md:p-3 bg-primary/10 rounded-lg flex-shrink-0">
              <FileText size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold text-secondary">{materials.length}</p>
              <p className="text-xs md:text-sm text-gray-600">Total supports</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 md:p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 md:p-3 bg-red-100 rounded-lg flex-shrink-0">
              <FileText size={20} className="text-red-500" />
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold text-secondary">
                {materials.filter((m) => m.file_type === 'pdf').length}
              </p>
              <p className="text-xs md:text-sm text-gray-600">Fichiers PDF</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 md:p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 md:p-3 bg-blue-100 rounded-lg flex-shrink-0">
              <ImageIcon size={20} className="text-blue-500" />
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold text-secondary">
                {materials.filter((m) => m.file_type === 'image').length}
              </p>
              <p className="text-xs md:text-sm text-gray-600">Images</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 md:p-4 mb-4 md:mb-6">
        <div className="flex flex-col gap-3 md:flex-row md:gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par titre ou session..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[44px]"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400 hidden md:block" />
            <select
              value={filterClassId === 'all' ? 'all' : filterClassId}
              onChange={(e) => setFilterClassId(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="flex-1 md:flex-none px-3 md:px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[44px]"
            >
              <option value="all">Toutes les classes</option>
              {enrollments.map((enrollment) => (
                <option key={enrollment.class_id} value={enrollment.class_id}>
                  {enrollment.class?.program?.name} - {enrollment.class?.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Materials List */}
      {sortedMaterials.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 md:p-12 text-center">
          <FileText size={40} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-sm md:text-base">
            {searchTerm || filterClassId !== 'all'
              ? 'Aucun support ne correspond a votre recherche'
              : 'Aucun support de cours disponible pour le moment'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Support
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Replay
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Session
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Date
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Taille
                  </th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sortedMaterials.map((material) => (
                  <tr key={material.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {getFileIcon(material.file_type)}
                        <div>
                          <p className="font-medium text-gray-900">{material.title}</p>
                          <span className="inline-block px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-600 mt-1">
                            {material.file_type.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {material.session?.replay_url ? (
                        material.session.replay_valid ? (
                          <button
                            onClick={() => material.session && setSelectedSession(material.session)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                          >
                            <Play size={12} className="text-green-600" />
                            Regarder
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">
                            <Play size={12} className="text-red-500" />
                            Expire
                          </span>
                        )
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <BookOpen size={16} className="text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-900">
                            {material.session?.title || 'Session inconnue'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {material.session?.class?.program?.name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {material.session?.scheduled_at
                            ? format(new Date(material.session.scheduled_at), 'dd/MM/yyyy', { locale: fr })
                            : '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {materialsApi.formatFileSize(material.file_size)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end">
                        <a
                          href={materialsApi.getFileUrl(material.file_path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          <Download size={16} />
                          Telecharger
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {sortedMaterials.map((material) => (
              <div
                key={material.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 bg-gray-50 rounded-lg flex-shrink-0">
                    {getFileIcon(material.file_type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 text-sm truncate">{material.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-block px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-600">
                        {material.file_type.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">
                        {materialsApi.formatFileSize(material.file_size)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <BookOpen size={14} className="text-gray-400 flex-shrink-0" />
                    <span className="truncate">{material.session?.title || 'Session inconnue'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                    <span>
                      {material.session?.scheduled_at
                        ? format(new Date(material.session.scheduled_at), 'dd/MM/yyyy', { locale: fr })
                        : '-'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={materialsApi.getFileUrl(material.file_path)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 active:bg-primary/80 transition-colors min-h-[44px]"
                  >
                    <Download size={16} />
                    Telecharger
                  </a>
                  {material.session?.replay_url && material.session.replay_valid && (
                    <button
                      onClick={() => material.session && setSelectedSession(material.session)}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-green-100 text-green-700 text-sm rounded-lg hover:bg-green-200 active:bg-green-300 transition-colors min-h-[44px]"
                    >
                      <Play size={16} />
                      Replay
                    </button>
                  )}
                  {material.session?.replay_url && !material.session.replay_valid && (
                    <span className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-red-100 text-red-600 text-sm rounded-lg min-h-[44px]">
                      <Play size={16} />
                      Expire
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
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
                {selectedSession.scheduled_at && format(new Date(selectedSession.scheduled_at), 'EEEE d MMMM yyyy', { locale: fr })}
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
