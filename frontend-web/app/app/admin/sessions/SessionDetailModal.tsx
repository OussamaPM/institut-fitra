'use client';

import { useState, useEffect, useRef } from 'react';
import { Session, SessionMaterial, Quiz, QuizQuestion, QuizQuestionType } from '@/lib/types';
import { Modal, Button, Badge } from '@/components/ui';
import materialsApi from '@/lib/api/materials';
import quizzesApi from '@/lib/api/quizzes';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatParis } from '@/lib/datetime';
import {
  Calendar,
  Clock,
  User,
  BookOpen,
  Video,
  Edit,
  Trash2,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Upload,
  Download,
  X,
  Plus,
  Loader2,
  Play,
  Save,
  HelpCircle,
  ChevronUp,
  ChevronDown,
  CheckCircle,
  Users,
} from 'lucide-react';
import sessionsApi from '@/lib/api/sessions';

interface QuizOptionDraft {
  option_text: string;
  is_correct: boolean;
}

interface QuizQuestionDraft {
  question_text: string;
  type: QuizQuestionType;
  answer_explanation: string;
  options: QuizOptionDraft[];
}

interface SessionDetailModalProps {
  session: Session;
  onClose: () => void;
  onEdit: (session: Session) => void;
  onDelete: (sessionId: number) => void;
  onUpdate?: (session: Session) => void;
}

export default function SessionDetailModal({
  session,
  onClose,
  onEdit,
  onDelete,
  onUpdate,
}: SessionDetailModalProps) {
  const [materials, setMaterials] = useState<SessionMaterial[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Replay state
  const [showReplayForm, setShowReplayForm] = useState(false);
  const [replayUrl, setReplayUrl] = useState(session.replay_url || '');
  const [replayValidityDays, setReplayValidityDays] = useState(session.replay_validity_days || 7);
  const [savingReplay, setSavingReplay] = useState(false);
  const [currentSession, setCurrentSession] = useState(session);

  // Quiz state
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(true);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestionDraft[]>([]);
  const [openExplanations, setOpenExplanations] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetchMaterials();
    fetchQuiz();
  }, [session.id]);

  const fetchMaterials = async () => {
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

  const fetchQuiz = async () => {
    try {
      setLoadingQuiz(true);
      const data = await quizzesApi.getForSession(session.id, session.class_id);
      setQuiz(data);
    } catch (error) {
      console.error('Error fetching quiz:', error);
    } finally {
      setLoadingQuiz(false);
    }
  };

  const addQuestion = () => {
    setQuizQuestions([...quizQuestions, { question_text: '', type: 'multiple_choice', answer_explanation: '', options: [{ option_text: '', is_correct: true }, { option_text: '', is_correct: false }] }]);
  };

  const removeQuestion = (index: number) => {
    setQuizQuestions(quizQuestions.filter((_, i) => i !== index));
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newQuestions = [...quizQuestions];
    const target = direction === 'up' ? index - 1 : index + 1;
    [newQuestions[index], newQuestions[target]] = [newQuestions[target], newQuestions[index]];
    setQuizQuestions(newQuestions);
  };

  const updateQuestion = (index: number, field: keyof QuizQuestionDraft, value: string) => {
    const newQuestions = [...quizQuestions];
    if (field === 'type') {
      const newType = value as QuizQuestionType;
      newQuestions[index] = {
        ...newQuestions[index],
        type: newType,
        options: newType === 'multiple_choice' ? [{ option_text: '', is_correct: true }, { option_text: '', is_correct: false }] : [],
      };
    } else {
      newQuestions[index] = { ...newQuestions[index], [field]: value };
    }
    setQuizQuestions(newQuestions);
  };

  const addOption = (questionIndex: number) => {
    const newQuestions = [...quizQuestions];
    newQuestions[questionIndex].options.push({ option_text: '', is_correct: false });
    setQuizQuestions(newQuestions);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const newQuestions = [...quizQuestions];
    newQuestions[questionIndex].options = newQuestions[questionIndex].options.filter((_, i) => i !== optionIndex);
    setQuizQuestions(newQuestions);
  };

  const updateOption = (questionIndex: number, optionIndex: number, field: 'option_text' | 'is_correct', value: string | boolean) => {
    const newQuestions = [...quizQuestions];
    if (field === 'is_correct' && value === true) {
      // Une seule bonne réponse par question
      newQuestions[questionIndex].options = newQuestions[questionIndex].options.map((opt, i) => ({ ...opt, is_correct: i === optionIndex }));
    } else {
      newQuestions[questionIndex].options[optionIndex] = { ...newQuestions[questionIndex].options[optionIndex], [field]: value };
    }
    setQuizQuestions(newQuestions);
  };

  const openQuizForm = (existing?: Quiz) => {
    if (existing) {
      setQuizTitle(existing.title);
      setQuizDescription(existing.description || '');
      setQuizQuestions(
        (existing.questions || []).map((q) => ({
          question_text: q.question_text,
          type: q.type,
          answer_explanation: q.answer_explanation || '',
          options: (q.options || []).map((o) => ({ option_text: o.option_text, is_correct: o.is_correct ?? false })),
        }))
      );
    } else {
      setQuizTitle('');
      setQuizDescription('');
      setQuizQuestions([{ question_text: '', type: 'multiple_choice', answer_explanation: '', options: [{ option_text: '', is_correct: true }, { option_text: '', is_correct: false }] }]);
    }
    setOpenExplanations({});
    setShowQuizForm(true);
  };

  const handleSaveQuiz = async () => {
    if (!quizTitle.trim() || quizQuestions.length === 0) return;

    for (const q of quizQuestions) {
      if (!q.question_text.trim()) { alert('Toutes les questions doivent avoir un texte.'); return; }
      if (q.type === 'multiple_choice') {
        if (q.options.length < 2) { alert('Chaque QCM doit avoir au moins 2 options.'); return; }
        if (q.options.some((o) => !o.option_text.trim())) { alert('Toutes les options doivent être renseignées.'); return; }
        if (!q.options.some((o) => o.is_correct)) { alert('Chaque QCM doit avoir une bonne réponse.'); return; }
      }
    }

    try {
      setSavingQuiz(true);
      // Ne pas envoyer d'options pour les questions à réponse libre (le backend
      // valide min:2 options dès que le champ est présent)
      const payloadQuestions = quizQuestions.map((q) => ({
        question_text: q.question_text,
        type: q.type,
        answer_explanation: q.answer_explanation.trim() || undefined,
        ...(q.type === 'multiple_choice' ? { options: q.options } : {}),
      }));
      if (quiz) {
        const updated = await quizzesApi.update(quiz.id, { title: quizTitle, description: quizDescription, questions: payloadQuestions });
        setQuiz(updated);
      } else {
        const created = await quizzesApi.create({ session_id: session.id, class_id: session.class_id, title: quizTitle, description: quizDescription, questions: payloadQuestions });
        setQuiz(created);
      }
      setShowQuizForm(false);
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Erreur lors de la sauvegarde du quiz.';
      alert(msg);
    } finally {
      setSavingQuiz(false);
    }
  };

  const handleDeleteQuiz = async () => {
    if (!quiz) return;
    if (!confirm('Supprimer ce quiz ? Les soumissions des élèves seront également supprimées.')) return;
    try {
      await quizzesApi.delete(quiz.id);
      setQuiz(null);
    } catch {
      alert('Erreur lors de la suppression du quiz.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Pré-remplir le titre avec le nom du fichier (sans extension)
      if (!uploadTitle) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setUploadTitle(nameWithoutExt);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadTitle.trim()) return;

    try {
      setUploading(true);
      await materialsApi.upload(session.id, uploadTitle.trim(), selectedFile);
      await fetchMaterials();
      setUploadTitle('');
      setSelectedFile(null);
      setShowUploadForm(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Error uploading file:', error);
      const errorMessage = error?.response?.data?.message || 'Erreur lors de l\'upload du fichier';
      alert(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMaterial = async (materialId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce support ?')) return;

    try {
      await materialsApi.delete(materialId);
      await fetchMaterials();
    } catch (error) {
      console.error('Error deleting material:', error);
      alert('Erreur lors de la suppression du support');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="primary">Planifié</Badge>;
      case 'in_progress':
        return <Badge variant="warning">En cours</Badge>;
      case 'completed':
        return <Badge variant="success">Terminé</Badge>;
      case 'cancelled':
        return <Badge variant="error">Annulé</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
        return <FileText size={20} className="text-red-500" />;
      case 'image':
        return <ImageIcon size={20} className="text-blue-500" />;
      default:
        return <FileText size={20} className="text-gray-500" />;
    }
  };

  const handleSaveReplay = async () => {
    try {
      setSavingReplay(true);
      const updatedSession = await sessionsApi.update(currentSession.id, {
        replay_url: replayUrl || undefined,
        replay_validity_days: replayUrl ? replayValidityDays : undefined,
      });
      setCurrentSession(updatedSession);
      setShowReplayForm(false);
      if (onUpdate) {
        onUpdate(updatedSession);
      }
    } catch (error: any) {
      console.error('Error saving replay:', error);
      const errorMessage = error?.response?.data?.message || 'Erreur lors de la sauvegarde du replay';
      alert(errorMessage);
    } finally {
      setSavingReplay(false);
    }
  };

  const handleDeleteReplay = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce replay ?')) return;

    try {
      setSavingReplay(true);
      const updatedSession = await sessionsApi.update(currentSession.id, {
        replay_url: '',
        replay_validity_days: undefined,
      });
      setCurrentSession(updatedSession);
      setReplayUrl('');
      setReplayValidityDays(7);
      if (onUpdate) {
        onUpdate(updatedSession);
      }
    } catch (error: any) {
      console.error('Error deleting replay:', error);
      alert('Erreur lors de la suppression du replay');
    } finally {
      setSavingReplay(false);
    }
  };

  const scheduledDate = new Date(session.scheduled_at);
  const endDate = new Date(scheduledDate.getTime() + session.duration_minutes * 60000);

  return (
    <Modal isOpen={true} onClose={onClose} title="Détails de la session" size="xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b pb-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-playfair font-semibold text-secondary">
                {session.title}
              </h2>
              <div className="mt-2 flex items-center gap-2">
                {getStatusBadge(session.status)}
                {session.level_number && (
                  <span className="px-2.5 py-1 text-xs rounded-full bg-primary/10 text-primary font-medium">
                    Niveau {session.level_number}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Session Info - Grid Layout 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Date */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={18} className="text-primary" />
              <p className="font-medium text-gray-700">Date</p>
            </div>
            <p className="text-lg text-secondary capitalize">
              {formatParis(scheduledDate, 'EEEE d MMMM yyyy')}
            </p>
          </div>

          {/* Time & Duration */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={18} className="text-primary" />
              <p className="font-medium text-gray-700">Horaires</p>
            </div>
            <p className="text-lg text-secondary">
              {formatParis(scheduledDate, 'HH:mm')} - {formatParis(endDate, 'HH:mm')}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Durée : {Math.floor(session.duration_minutes / 60)}h
              {session.duration_minutes % 60 > 0 ? `${session.duration_minutes % 60}min` : ''}
            </p>
          </div>

          {/* Teacher */}
          {session.teacher && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <User size={18} className="text-primary" />
                <p className="font-medium text-gray-700">Enseignant</p>
              </div>
              <p className="text-secondary font-medium">
                {session.teacher.teacher_profile?.first_name}{' '}
                {session.teacher.teacher_profile?.last_name}
              </p>
              <p className="text-sm text-gray-500">{session.teacher.email}</p>
            </div>
          )}

          {/* Class */}
          {session.class && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen size={18} className="text-primary" />
                <p className="font-medium text-gray-700">Classe</p>
              </div>
              <p className="text-secondary font-medium">{session.class.name}</p>
              <p className="text-sm text-gray-500">{session.class.program?.name}</p>
              <p className="text-xs text-gray-400 mt-1">
                Année : {session.class.academic_year}
              </p>
            </div>
          )}

          {/* Zoom Meeting */}
          {session.class?.zoom_link && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Video size={18} className="text-blue-600" />
                <p className="font-medium text-blue-900">Zoom</p>
              </div>
              <a
                href={session.class.zoom_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <Video size={16} />
                <span>Rejoindre la session</span>
                <ExternalLink size={14} />
              </a>
            </div>
          )}

          {/* Description */}
          {session.description && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium text-gray-700 mb-2">Description</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{session.description}</p>
            </div>
          )}
        </div>

        {/* Supports & Replay - 2 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 border-t pt-4">
          {/* Supports de cours */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-primary" />
                <p className="font-medium text-gray-700">Supports</p>
                <span className="text-xs text-gray-500">({materials.length})</span>
              </div>
              {!showUploadForm && (
                <button
                  onClick={() => setShowUploadForm(true)}
                  className="text-primary hover:text-primary/80 text-sm flex items-center gap-1"
                >
                  <Plus size={14} />
                  Ajouter
                </button>
              )}
            </div>

            {/* Upload Form */}
            {showUploadForm && (
              <div className="bg-white border rounded-lg p-3 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">Nouveau support</p>
                  <button
                    onClick={() => {
                      setShowUploadForm(false);
                      setUploadTitle('');
                      setSelectedFile(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="Titre du support"
                    className="input w-full text-sm"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.bmp,.svg,.doc,.docx,.odt,.ppt,.pptx,.odp,.xls,.xlsx,.ods,.txt,.rtf"
                    onChange={handleFileSelect}
                    className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-primary file:text-white hover:file:bg-primary/90 file:cursor-pointer"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowUploadForm(false);
                        setUploadTitle('');
                        setSelectedFile(null);
                      }}
                      className="text-xs px-2 py-1"
                    >
                      Annuler
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleUpload}
                      disabled={!selectedFile || !uploadTitle.trim() || uploading}
                      className="text-xs px-2 py-1 flex items-center gap-1"
                    >
                      {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                      {uploading ? 'Upload...' : 'Uploader'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Materials List */}
            <div className="max-h-40 overflow-y-auto">
              {loadingMaterials ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 size={20} className="animate-spin text-primary" />
                </div>
              ) : materials.length === 0 ? (
                <p className="text-gray-400 text-xs text-center py-4">Aucun support</p>
              ) : (
                <div className="space-y-1">
                  {materials.map((material) => (
                    <div
                      key={material.id}
                      className="flex items-center justify-between p-2 bg-white rounded hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {getFileIcon(material.file_type)}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-700 truncate">{material.title}</p>
                          <p className="text-xs text-gray-400">{materialsApi.formatFileSize(material.file_size)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <a
                          href={materialsApi.getFileUrl(material.file_path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                        >
                          <Download size={14} />
                        </a>
                        <button
                          onClick={() => handleDeleteMaterial(material.id)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section Replay */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Play size={18} className="text-primary" />
                <p className="font-medium text-gray-700">Replay</p>
              </div>
              {!showReplayForm && !currentSession.replay_url && (
                <button
                  onClick={() => setShowReplayForm(true)}
                  className="text-primary hover:text-primary/80 text-sm flex items-center gap-1"
                >
                  <Plus size={14} />
                  Ajouter
                </button>
              )}
            </div>

            {/* Replay Form */}
            {showReplayForm && (
              <div className="bg-white border rounded-lg p-3 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">
                    {currentSession.replay_url ? 'Modifier' : 'Ajouter'}
                  </p>
                  <button
                    onClick={() => {
                      setShowReplayForm(false);
                      setReplayUrl(currentSession.replay_url || '');
                      setReplayValidityDays(currentSession.replay_validity_days || 7);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={replayUrl}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      const srcMatch = val.match(/src=["']([^"']+)["']/);
                      setReplayUrl(srcMatch ? srcMatch[1].split('?')[0] : val.split('?')[0]);
                    }}
                    placeholder="https://player.vimeo.com/video/... ou coller le code embed complet"
                    className="input w-full text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={replayValidityDays}
                      onChange={(e) => setReplayValidityDays(Math.max(1, Math.min(365, Number(e.target.value) || 7)))}
                      className="input w-20 text-sm"
                    />
                    <span className="text-xs text-gray-500">jours</span>
                    <div className="flex gap-1">
                      {[7, 15, 30].map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setReplayValidityDays(days)}
                          className={`px-1.5 py-0.5 text-xs rounded transition-colors ${
                            replayValidityDays === days
                              ? 'bg-primary text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {days}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowReplayForm(false);
                        setReplayUrl(currentSession.replay_url || '');
                        setReplayValidityDays(currentSession.replay_validity_days || 7);
                      }}
                      className="text-xs px-2 py-1"
                    >
                      Annuler
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveReplay}
                      disabled={!replayUrl.trim() || savingReplay}
                      className="text-xs px-2 py-1 flex items-center gap-1"
                    >
                      {savingReplay ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                      {savingReplay ? 'Sauvegarde...' : 'Sauvegarder'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Existing Replay Display */}
            {currentSession.replay_url && !showReplayForm && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Video size={16} className="text-purple-600" />
                  <span className="text-sm font-medium text-purple-900">Disponible</span>
                  {currentSession.replay_valid ? (
                    <Badge variant="success">Actif</Badge>
                  ) : (
                    <Badge variant="error">Expiré</Badge>
                  )}
                </div>
                <div className="text-xs text-purple-700 space-y-0.5 mb-2">
                  <p>Validité : {currentSession.replay_validity_days} jours</p>
                  {currentSession.replay_added_at && (
                    <p>Ajouté : {format(new Date(currentSession.replay_added_at), 'dd/MM/yy HH:mm', { locale: fr })}</p>
                  )}
                  {currentSession.replay_expires_at && (
                    <p>Expire : {format(new Date(currentSession.replay_expires_at), 'dd/MM/yy HH:mm', { locale: fr })}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowReplayForm(true)}
                    className="text-xs text-purple-700 hover:text-purple-900 flex items-center gap-1"
                  >
                    <Edit size={12} />
                    Modifier
                  </button>
                  <button
                    onClick={handleDeleteReplay}
                    disabled={savingReplay}
                    className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
                  >
                    <Trash2 size={12} />
                    Supprimer
                  </button>
                </div>
              </div>
            )}

            {!currentSession.replay_url && !showReplayForm && (
              <p className="text-gray-400 text-xs text-center py-4">Aucun replay</p>
            )}
          </div>
        </div>

        {/* Section Quiz */}
        <div className="border-t pt-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <HelpCircle size={18} className="text-primary" />
                <p className="font-medium text-gray-700">Quiz</p>
                {quiz && (
                  <span className="text-xs text-gray-500">({quiz.submissions_count ?? 0} soumission{(quiz.submissions_count ?? 0) > 1 ? 's' : ''})</span>
                )}
              </div>
              {!showQuizForm && !quiz && (
                <button onClick={() => openQuizForm()} className="text-primary hover:text-primary/80 text-sm flex items-center gap-1">
                  <Plus size={14} />
                  Créer
                </button>
              )}
            </div>

            {loadingQuiz ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 size={20} className="animate-spin text-primary" />
              </div>
            ) : showQuizForm ? (
              /* ── Formulaire de création/édition ── */
              <div className="bg-white border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">{quiz ? 'Modifier le quiz' : 'Nouveau quiz'}</p>
                  <button onClick={() => setShowQuizForm(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                </div>

                <input
                  type="text"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  placeholder="Titre du quiz *"
                  className="input w-full text-sm"
                />
                <textarea
                  value={quizDescription}
                  onChange={(e) => setQuizDescription(e.target.value)}
                  placeholder="Description (optionnel)"
                  rows={2}
                  className="input w-full text-sm resize-none"
                />

                {/* Questions */}
                <div className="space-y-4">
                  {quizQuestions.map((question, qIndex) => (
                    <div key={qIndex} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-gray-500 w-6">Q{qIndex + 1}</span>
                        <select
                          value={question.type}
                          onChange={(e) => updateQuestion(qIndex, 'type', e.target.value)}
                          className="input text-xs py-1 px-2"
                        >
                          <option value="multiple_choice">Choix multiple</option>
                          <option value="free_text">Réponse libre</option>
                        </select>
                        <div className="flex gap-1 ml-auto">
                          <button disabled={qIndex === 0} onClick={() => moveQuestion(qIndex, 'up')} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronUp size={14} /></button>
                          <button disabled={qIndex === quizQuestions.length - 1} onClick={() => moveQuestion(qIndex, 'down')} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronDown size={14} /></button>
                          <button onClick={() => removeQuestion(qIndex)} className="p-1 text-red-400 hover:text-red-600"><X size={14} /></button>
                        </div>
                      </div>

                      <input
                        type="text"
                        value={question.question_text}
                        onChange={(e) => updateQuestion(qIndex, 'question_text', e.target.value)}
                        placeholder="Texte de la question *"
                        className="input w-full text-sm mb-2"
                      />

                      {question.type === 'multiple_choice' && (
                        <div className="space-y-1.5">
                          {question.options.map((option, oIndex) => (
                            <div key={oIndex} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`correct-${qIndex}`}
                                checked={option.is_correct}
                                onChange={() => updateOption(qIndex, oIndex, 'is_correct', true)}
                                className="accent-green-600 flex-shrink-0"
                                title="Bonne réponse"
                              />
                              <input
                                type="text"
                                value={option.option_text}
                                onChange={(e) => updateOption(qIndex, oIndex, 'option_text', e.target.value)}
                                placeholder={`Option ${oIndex + 1}`}
                                className={`input flex-1 text-xs py-1 ${option.is_correct ? 'border-green-300 bg-green-50' : ''}`}
                              />
                              {question.options.length > 2 && (
                                <button onClick={() => removeOption(qIndex, oIndex)} className="p-0.5 text-red-400 hover:text-red-600 flex-shrink-0"><X size={12} /></button>
                              )}
                            </div>
                          ))}
                          <button onClick={() => addOption(qIndex)} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 mt-1">
                            <Plus size={12} />
                            Ajouter une option
                          </button>
                        </div>
                      )}

                      {/* Détail de la réponse (affiché à l'élève après soumission) */}
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <button
                          type="button"
                          onClick={() => setOpenExplanations((prev) => ({ ...prev, [qIndex]: !prev[qIndex] }))}
                          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80"
                        >
                          {openExplanations[qIndex] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          Détail de la réponse
                          {question.answer_explanation.trim() && !openExplanations[qIndex] && (
                            <span className="text-[10px] text-gray-400">(renseigné)</span>
                          )}
                        </button>
                        {openExplanations[qIndex] && (
                          <textarea
                            value={question.answer_explanation}
                            onChange={(e) => updateQuestion(qIndex, 'answer_explanation', e.target.value)}
                            placeholder="Explication affichée à l'élève après soumission (optionnel)"
                            rows={3}
                            className="input w-full text-sm mt-2 resize-none"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={addQuestion} className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2">
                  <Plus size={16} />
                  Ajouter une question
                </button>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" onClick={() => setShowQuizForm(false)} className="text-xs">Annuler</Button>
                  <Button size="sm" onClick={handleSaveQuiz} disabled={!quizTitle.trim() || quizQuestions.length === 0 || savingQuiz} className="text-xs flex items-center gap-1">
                    {savingQuiz ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    {savingQuiz ? 'Sauvegarde...' : 'Sauvegarder'}
                  </Button>
                </div>
              </div>
            ) : quiz ? (
              /* ── Quiz existant ── */
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle size={16} className="text-amber-600 flex-shrink-0" />
                      <p className="text-sm font-medium text-amber-900 truncate">{quiz.title}</p>
                    </div>
                    <p className="text-xs text-amber-700 mb-2">
                      {quiz.questions?.length ?? 0} question{(quiz.questions?.length ?? 0) > 1 ? 's' : ''} · {quiz.submissions_count ?? 0} soumission{(quiz.submissions_count ?? 0) > 1 ? 's' : ''}
                    </p>
                    {quiz.description && <p className="text-xs text-amber-600 mb-2 line-clamp-2">{quiz.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => openQuizForm(quiz)} className="text-xs text-amber-700 hover:text-amber-900 flex items-center gap-1">
                    <Edit size={12} />
                    Modifier
                  </button>
                  {(quiz.submissions_count ?? 0) > 0 && (
                    <a href={`/app/admin/quizzes/${quiz.id}/results`} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                      <Users size={12} />
                      Voir résultats
                    </a>
                  )}
                  <button onClick={handleDeleteQuiz} className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1">
                    <Trash2 size={12} />
                    Supprimer
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-xs text-center py-4">Aucun quiz</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onDelete(session.id)}
            className="text-red-600 hover:bg-red-50 border-red-300"
          >
            <Trash2 size={18} className="mr-2" />
            Supprimer
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
            <Button onClick={() => onEdit(session)}>
              <Edit size={18} className="mr-2" />
              Modifier
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
