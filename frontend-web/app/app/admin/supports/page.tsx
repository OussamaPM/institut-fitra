'use client';

import { useState, useEffect, useRef } from 'react';
import { SessionMaterial, Session } from '@/lib/types';
import materialsApi from '@/lib/api/materials';
import sessionsApi from '@/lib/api/sessions';
import { Button, Badge, Modal } from '@/components/ui';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  FileText,
  Image as ImageIcon,
  Download,
  Trash2,
  Loader2,
  BookOpen,
  Calendar,
  User,
  Search,
  Filter,
  Play,
  Plus,
  Upload,
  Save,
} from 'lucide-react';

// Type unifié pour afficher supports et sessions avec replay
interface TableRow {
  id: string;
  type: 'material' | 'replay-only';
  material?: SessionMaterial;
  session: Session;
}

export default function SupportsPage() {
  const [materials, setMaterials] = useState<SessionMaterial[]>([]);
  const [sessionsWithReplay, setSessionsWithReplay] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('');

  // Replay modal state
  const [showReplayModal, setShowReplayModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [replayUrl, setReplayUrl] = useState('');
  const [replayValidityDays, setReplayValidityDays] = useState(7);
  const [savingReplay, setSavingReplay] = useState(false);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadSession, setUploadSession] = useState<Session | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch materials and sessions in parallel
      const [materialsResponse, sessionsResponse] = await Promise.all([
        materialsApi.getAll({ per_page: 500 }),
        sessionsApi.getAll({ per_page: 500 }),
      ]);

      setMaterials(materialsResponse.data || []);

      // Filter sessions that have replay but no materials
      const materialSessionIds = new Set((materialsResponse.data || []).map(m => m.session_id));
      const sessionsOnlyWithReplay = (sessionsResponse.data || []).filter(
        s => s.replay_url && !materialSessionIds.has(s.id)
      );
      setSessionsWithReplay(sessionsOnlyWithReplay);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMaterial = async (materialId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce support ?')) return;

    try {
      await materialsApi.delete(materialId);
      await fetchData();
    } catch (error) {
      console.error('Error deleting material:', error);
      alert('Erreur lors de la suppression du support');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!uploadTitle) {
        setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const openUploadModal = (session: Session) => {
    setUploadSession(session);
    setUploadTitle('');
    setSelectedFile(null);
    setShowUploadModal(true);
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setUploadSession(null);
    setUploadTitle('');
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!uploadSession || !selectedFile || !uploadTitle.trim()) return;

    try {
      setUploading(true);
      await materialsApi.upload(uploadSession.id, selectedFile, uploadTitle.trim());
      await fetchData();
      closeUploadModal();
    } catch (error: any) {
      console.error('Error uploading file:', error);
      alert(error?.response?.data?.message || 'Erreur lors de l\'upload du fichier');
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
        return <FileText size={24} className="text-red-500" />;
      case 'image':
        return <ImageIcon size={24} className="text-blue-500" />;
      default:
        return <FileText size={24} className="text-gray-500" />;
    }
  };

  const getFileTypeBadge = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
        return <Badge variant="error">PDF</Badge>;
      case 'image':
        return <Badge variant="primary">Image</Badge>;
      default:
        return <Badge variant="neutral">{fileType}</Badge>;
    }
  };

  const openReplayModal = (session: Session) => {
    setSelectedSession(session);
    setReplayUrl(session.replay_url || '');
    setReplayValidityDays(session.replay_validity_days || 7);
    setShowReplayModal(true);
  };

  const closeReplayModal = () => {
    setShowReplayModal(false);
    setSelectedSession(null);
    setReplayUrl('');
    setReplayValidityDays(7);
  };

  const handleSaveReplay = async () => {
    if (!selectedSession) return;

    try {
      setSavingReplay(true);
      await sessionsApi.update(selectedSession.id, {
        replay_url: replayUrl || null,
        replay_validity_days: replayUrl ? replayValidityDays : null,
      });
      // Refresh data to get updated session data
      await fetchData();
      closeReplayModal();
    } catch (error: any) {
      console.error('Error saving replay:', error);
      alert(error?.response?.data?.message || 'Erreur lors de la sauvegarde du replay');
    } finally {
      setSavingReplay(false);
    }
  };

  // Créer les lignes du tableau combinant materials et sessions avec replay seul
  const tableRows: TableRow[] = [
    // Lignes des materials
    ...materials.map((material) => ({
      id: `material-${material.id}`,
      type: 'material' as const,
      material,
      session: material.session!,
    })),
    // Lignes des sessions avec replay mais sans support
    ...sessionsWithReplay.map((session) => ({
      id: `replay-${session.id}`,
      type: 'replay-only' as const,
      session,
    })),
  ];

  // Filtrer les lignes côté client
  const filteredRows = tableRows.filter((row) => {
    const session = row.session;
    const material = row.material;

    const matchesSearch =
      searchTerm === '' ||
      material?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session?.class?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    // Filtre par type: si "replay-only" sélectionné, montrer les sessions sans support
    const matchesType =
      filterType === '' ||
      (filterType === 'replay-only' && row.type === 'replay-only') ||
      (filterType !== 'replay-only' && material?.file_type === filterType);

    return matchesSearch && matchesType;
  });

  // Trier par date de session (les plus récentes en premier)
  const sortedRows = [...filteredRows].sort((a, b) => {
    const dateA = a.session?.scheduled_at ? new Date(a.session.scheduled_at).getTime() : 0;
    const dateB = b.session?.scheduled_at ? new Date(b.session.scheduled_at).getTime() : 0;
    return dateB - dateA;
  });

  if (loading && materials.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-playfair font-semibold text-secondary">
          Supports et Replays
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Gérez les supports de cours et les replays des sessions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <FileText size={24} className="text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary">{materials.length}</p>
              <p className="text-sm text-gray-600">Total supports</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Play size={24} className="text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary">
                {materials.filter((m) => m.session?.replay_url).length + sessionsWithReplay.length}
              </p>
              <p className="text-sm text-gray-600">Total replays</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-lg">
              <FileText size={24} className="text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary">
                {materials.filter((m) => m.file_type === 'pdf').length}
              </p>
              <p className="text-sm text-gray-600">Fichiers PDF</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Play size={24} className="text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary">
                {sessionsWithReplay.length}
              </p>
              <p className="text-sm text-gray-600">Replays sans support</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par titre, session ou classe..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input"
            >
              <option value="">Tous</option>
              <option value="pdf">PDF</option>
              <option value="image">Images</option>
              <option value="replay-only">Replays sans support</option>
            </select>
          </div>
        </div>
      </div>

      {/* Materials Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
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
                  Classe
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                  Date upload
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                  Taille
                </th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm || filterType
                      ? 'Aucun élément ne correspond aux critères de recherche'
                      : 'Aucun support ou replay disponible'}
                  </td>
                </tr>
              ) : (
                sortedRows.map((row) => (
                  <tr key={row.id} className={`hover:bg-gray-50 ${row.type === 'replay-only' ? 'bg-purple-50/30' : ''}`}>
                    {/* Colonne Support */}
                    <td className="px-6 py-4">
                      {row.material ? (
                        <div className="flex items-center gap-3">
                          {getFileIcon(row.material.file_type)}
                          <div>
                            <p className="font-medium text-gray-900">{row.material.title}</p>
                            <div className="mt-1">{getFileTypeBadge(row.material.file_type)}</div>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => openUploadModal(row.session)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          <Upload size={14} />
                          Ajouter un support
                        </button>
                      )}
                    </td>
                    {/* Colonne Replay */}
                    <td className="px-6 py-4">
                      {row.session?.replay_url ? (
                        <button
                          onClick={() => openReplayModal(row.session)}
                          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                        >
                          <Play size={24} className={row.session.replay_valid ? 'text-green-500' : 'text-red-500'} />
                          <div>
                            <p className="font-medium text-gray-900 text-left">Replay</p>
                            <div className="mt-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                row.session.replay_valid
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-600'
                              }`}>
                                {row.session.replay_valid ? 'Actif' : 'Expiré'}
                              </span>
                            </div>
                          </div>
                        </button>
                      ) : (
                        <button
                          onClick={() => openReplayModal(row.session)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          <Plus size={14} />
                          Ajouter un replay
                        </button>
                      )}
                    </td>
                    {/* Colonne Session */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        <div>
                          {row.session?.scheduled_at ? (
                            <>
                              <p className="text-sm text-gray-900 capitalize">
                                {format(new Date(row.session.scheduled_at), 'EEEE', { locale: fr })}
                              </p>
                              <p className="text-xs text-gray-500">
                                {format(new Date(row.session.scheduled_at), 'd MMMM yyyy', { locale: fr })}
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-gray-500">Date inconnue</p>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* Colonne Classe */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <BookOpen size={16} className="text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-900">
                            {row.session?.class?.name || 'Classe inconnue'}
                          </p>
                          {row.session?.class?.program?.name && (
                            <p className="text-xs text-gray-500">
                              {row.session.class.program.name}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* Colonne Date upload / info */}
                    <td className="px-6 py-4">
                      {row.material ? (
                        <div>
                          <p className="text-sm text-gray-900">
                            {format(new Date(row.material.uploaded_at), 'd MMMM yyyy', { locale: fr })}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(row.material.uploaded_at), 'HH:mm', { locale: fr })}
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    {/* Colonne Taille */}
                    <td className="px-6 py-4">
                      {row.material ? (
                        <span className="text-sm text-gray-600">
                          {materialsApi.formatFileSize(row.material.file_size)}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    {/* Colonne Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {row.material && (
                          <>
                            <a
                              href={materialsApi.getFileUrl(row.material.file_path)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                              title="Télécharger"
                            >
                              <Download size={18} />
                            </a>
                            <button
                              onClick={() => handleDeleteMaterial(row.material!.id)}
                              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Upload Modal */}
      {showUploadModal && uploadSession && (
        <Modal
          isOpen={showUploadModal}
          onClose={closeUploadModal}
          title="Ajouter un support"
          size="md"
        >
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Session :</p>
              <p className="font-medium">{uploadSession.title}</p>
              {uploadSession.scheduled_at && (
                <p className="text-sm text-gray-500">
                  {format(new Date(uploadSession.scheduled_at), 'EEEE d MMMM yyyy', { locale: fr })}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Titre du support *
              </label>
              <input
                type="text"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Ex: Cours du jour, Résumé..."
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fichier *
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.bmp,.svg,.doc,.docx,.odt,.ppt,.pptx,.odp,.xls,.xlsx,.ods,.txt,.rtf"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary/90 file:cursor-pointer"
              />
              <p className="mt-1 text-xs text-gray-500">
                Formats acceptés : PDF, images, documents Office
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={closeUploadModal}>
                Annuler
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || !uploadTitle.trim() || uploading}
                className="flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Upload...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Uploader
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Replay Modal */}
      {showReplayModal && selectedSession && (
        <Modal
          isOpen={showReplayModal}
          onClose={closeReplayModal}
          title={selectedSession.replay_url ? 'Modifier le replay' : 'Ajouter un replay'}
          size="md"
        >
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Session :</p>
              <p className="font-medium">{selectedSession.title}</p>
              {selectedSession.scheduled_at && (
                <p className="text-sm text-gray-500">
                  {format(new Date(selectedSession.scheduled_at), 'EEEE d MMMM yyyy', { locale: fr })}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lien iframe Vimeo *
              </label>
              <input
                type="text"
                value={replayUrl}
                onChange={(e) => setReplayUrl(e.target.value)}
                placeholder="https://player.vimeo.com/video/..."
                className="input w-full"
              />
              <p className="mt-1 text-xs text-gray-500">
                Collez le lien iframe Vimeo (ex: https://player.vimeo.com/video/123456789)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Durée de disponibilité (jours) *
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={replayValidityDays}
                  onChange={(e) => setReplayValidityDays(Math.max(1, Math.min(365, Number(e.target.value) || 7)))}
                  className="input w-24"
                />
                <div className="flex gap-2">
                  {[7, 15, 30, 60].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setReplayValidityDays(days)}
                      className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                        replayValidityDays === days
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {days}j
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Entre 1 et 365 jours
              </p>
            </div>

            {selectedSession.replay_url && selectedSession.replay_added_at && (
              <div className="bg-purple-50 p-3 rounded-lg text-sm">
                <p className="text-purple-700">
                  Ajouté le : {format(new Date(selectedSession.replay_added_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                </p>
                {selectedSession.replay_expires_at && (
                  <p className="text-purple-700">
                    Expire le : {format(new Date(selectedSession.replay_expires_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={closeReplayModal}>
                Annuler
              </Button>
              <Button
                onClick={handleSaveReplay}
                disabled={!replayUrl.trim() || savingReplay}
                className="flex items-center gap-2"
              >
                {savingReplay ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Sauvegarder
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
