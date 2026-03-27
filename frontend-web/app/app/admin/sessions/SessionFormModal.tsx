'use client';

import { useState } from 'react';
import { Session, ClassModel } from '@/lib/types';
import sessionsApi from '@/lib/api/sessions';
import { useAuth } from '@/contexts/AuthContext';
import { Modal, Button, Input } from '@/components/ui';
import { format } from 'date-fns';
import { X } from 'lucide-react';

const SESSION_COLORS = [
  { value: '', label: 'Par défaut' },
  { value: '#6366f1', label: 'Indigo' },
  { value: '#10b981', label: 'Émeraude' },
  { value: '#f97316', label: 'Orange' },
  { value: '#0ea5e9', label: 'Bleu' },
  { value: '#ec4899', label: 'Rose' },
  { value: '#f59e0b', label: 'Ambre' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#14b8a6', label: 'Turquoise' },
  { value: '#ef4444', label: 'Rouge' },
  { value: '#84cc16', label: 'Vert lime' },
];

interface SessionFormModalProps {
  session: Session | null;
  classes: ClassModel[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function SessionFormModal({
  session,
  classes,
  onClose,
  onSuccess,
}: SessionFormModalProps) {
  const { user } = useAuth();
  const isEditing = !!session?.id;

  const [formData, setFormData] = useState({
    class_id: session?.class_id || '',
    teacher_id: session?.teacher_id || user?.id || '',
    title: session?.title || '',
    description: session?.description || '',
    scheduled_at: session?.scheduled_at
      ? format(new Date(session.scheduled_at), "yyyy-MM-dd'T'HH:mm")
      : '',
    duration_minutes: session?.duration_minutes || 90,
    status: session?.status || 'scheduled',
    color: session?.color || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.class_id) {
      newErrors.class_id = 'La classe est requise';
    }
    if (!formData.title.trim()) {
      newErrors.title = 'Le titre est requis';
    }
    if (!formData.scheduled_at) {
      newErrors.scheduled_at = 'La date et l\'heure sont requises';
    }
    if (!formData.duration_minutes || formData.duration_minutes < 1) {
      newErrors.duration_minutes = 'La durée doit être d\'au moins 1 minute';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      setLoading(true);

      const dataToSubmit = {
        ...formData,
        class_id: Number(formData.class_id),
        teacher_id: Number(formData.teacher_id),
        duration_minutes: Number(formData.duration_minutes),
        scheduled_at: new Date(formData.scheduled_at).toISOString(),
        color: formData.color || null,
      };

      if (isEditing && session?.id) {
        await sessionsApi.update(session.id, dataToSubmit);
      } else {
        await sessionsApi.create(dataToSubmit);
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving session:', error);
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        alert(
          error.response?.data?.message ||
            'Erreur lors de l\'enregistrement de la session'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isEditing ? 'Modifier la session' : 'Nouvelle session'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Class Selection */}
        <div>
          <label htmlFor="class_id" className="block text-sm font-medium text-gray-700 mb-1">
            Classe <span className="text-red-500">*</span>
          </label>
          <select
            id="class_id"
            name="class_id"
            value={formData.class_id}
            onChange={handleChange}
            className={`input w-full ${errors.class_id ? 'input-error' : ''}`}
            disabled={loading}
          >
            <option value="">Sélectionnez une classe</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} ({cls.academic_year})
              </option>
            ))}
          </select>
          {errors.class_id && <p className="text-red-500 text-sm mt-1">{errors.class_id}</p>}
        </div>

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Titre de la session <span className="text-red-500">*</span>
          </label>
          <Input
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            error={errors.title}
            disabled={loading}
            placeholder="Ex: Introduction à la grammaire arabe"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="input w-full"
            disabled={loading}
            placeholder="Description de la session (optionnel)"
          />
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="scheduled_at" className="block text-sm font-medium text-gray-700 mb-1">
              Date et heure <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              id="scheduled_at"
              name="scheduled_at"
              value={formData.scheduled_at}
              onChange={handleChange}
              className={`input w-full ${errors.scheduled_at ? 'input-error' : ''}`}
              disabled={loading}
            />
            {errors.scheduled_at && (
              <p className="text-red-500 text-sm mt-1">{errors.scheduled_at}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="duration_minutes"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Durée (minutes) <span className="text-red-500">*</span>
            </label>
            <Input
              id="duration_minutes"
              name="duration_minutes"
              type="number"
              min="1"
              value={formData.duration_minutes}
              onChange={handleChange}
              error={errors.duration_minutes}
              disabled={loading}
            />
          </div>
        </div>

        {/* Couleur */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Couleur de la session
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {SESSION_COLORS.map((c) => (
              <button
                key={c.value || 'default'}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, color: c.value }))}
                className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${
                  formData.color === c.value
                    ? 'border-gray-800 scale-110 shadow-md'
                    : 'border-gray-200 hover:border-gray-400 hover:scale-105'
                }`}
                style={c.value ? { backgroundColor: c.value } : { backgroundColor: '#f1f5f9' }}
                title={c.label}
              >
                {!c.value && (
                  <X size={14} className="text-gray-400" />
                )}
                {formData.color === c.value && c.value && (
                  <span className="text-white text-xs font-bold">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Status (only for editing) */}
        {isEditing && (
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Statut
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="input w-full"
              disabled={loading}
            >
              <option value="scheduled">Planifié</option>
              <option value="in_progress">En cours</option>
              <option value="completed">Terminé</option>
              <option value="cancelled">Annulé</option>
            </select>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Enregistrement...' : isEditing ? 'Modifier' : 'Créer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
