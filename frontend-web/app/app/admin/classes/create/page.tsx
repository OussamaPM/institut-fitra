'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Input } from '@/components/ui';
import { classesApi } from '@/lib/api/classes';
import { programsApi } from '@/lib/api/programs';
import { Program, ClassModel } from '@/lib/types';

export default function CreateClassPage() {
  const router = useRouter();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [programClasses, setProgramClasses] = useState<ClassModel[]>([]);
  const [hasParent, setHasParent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    program_id: '',
    name: '',
    academic_year: '',
    start_date: '',
    end_date: '',
    max_students: '',
    status: 'planned',
    zoom_link: '',
    parent_class_id: '',
  });

  useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    try {
      const response = await programsApi.getAll({ page: 1, per_page: 100 });
      setPrograms(response.data);
    } catch (err) {
      console.error('Failed to load programs:', err);
      setError('Impossible de charger les programmes.');
    }
  };

  const handleProgramChange = async (programId: string) => {
    setFormData(prev => ({ ...prev, program_id: programId, parent_class_id: '' }));
    setHasParent(false);
    if (!programId) { setProgramClasses([]); return; }
    try {
      const response = await classesApi.getAll({ program_id: parseInt(programId), per_page: 100 });
      setProgramClasses(response.data);
    } catch {
      setProgramClasses([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const payload = {
        program_id: parseInt(formData.program_id),
        name: formData.name,
        academic_year: formData.academic_year,
        start_date: formData.start_date,
        end_date: formData.end_date,
        max_students: formData.max_students ? parseInt(formData.max_students) : undefined,
        status: formData.status as 'planned' | 'ongoing' | 'completed' | 'cancelled',
        zoom_link: formData.zoom_link || undefined,
        parent_class_id: hasParent && formData.parent_class_id ? parseInt(formData.parent_class_id) : undefined,
      };

      await classesApi.create(payload);
      router.push('/admin/classes');
    } catch (err: any) {
      console.error('Failed to create class:', err);
      setError(err.response?.data?.message || 'Erreur lors de la création de la classe.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-playfair text-4xl font-semibold text-secondary mb-2">
          Créer une classe
        </h1>
        <p className="text-gray-600">
          Créez une nouvelle promotion pour un programme
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error rounded-lg">
          <p className="text-error text-sm">{error}</p>
        </div>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Programme */}
          <div>
            <label htmlFor="program_id" className="block text-sm font-medium text-secondary mb-2">
              Programme <span className="text-error">*</span>
            </label>
            <select
              id="program_id"
              name="program_id"
              value={formData.program_id}
              onChange={(e) => handleProgramChange(e.target.value)}
              required
              className="input w-full"
            >
              <option value="">Sélectionner un programme</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
          </div>

          {/* Classe précédente */}
          {formData.program_id && (
            <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
              <p className="text-sm font-medium text-secondary mb-3">
                Cette classe est-elle la suite d'une autre ?
              </p>
              <div className="flex gap-4 mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!hasParent}
                    onChange={() => { setHasParent(false); setFormData(prev => ({ ...prev, parent_class_id: '' })); }}
                    className="accent-primary"
                  />
                  <span className="text-sm text-gray-700">Non — nouvelle cohorte</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={hasParent}
                    onChange={() => setHasParent(true)}
                    disabled={programClasses.length === 0}
                    className="accent-primary"
                  />
                  <span className={`text-sm ${programClasses.length === 0 ? 'text-gray-400' : 'text-gray-700'}`}>
                    Oui — suite d'une classe existante
                    {programClasses.length === 0 && ' (aucune classe disponible)'}
                  </span>
                </label>
              </div>
              {hasParent && (
                <select
                  value={formData.parent_class_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, parent_class_id: e.target.value }))}
                  className="input w-full"
                >
                  <option value="">Sélectionner la classe précédente</option>
                  {programClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} — {cls.academic_year}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Nom de la classe */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-secondary mb-2">
              Nom de la classe <span className="text-error">*</span>
            </label>
            <Input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ex: Arabe N1 - Promotion 2025/2026"
              required
            />
          </div>

          {/* Année académique */}
          <div>
            <label htmlFor="academic_year" className="block text-sm font-medium text-secondary mb-2">
              Année académique <span className="text-error">*</span>
            </label>
            <Input
              id="academic_year"
              name="academic_year"
              type="text"
              value={formData.academic_year}
              onChange={handleChange}
              placeholder="Ex: 2025/2026"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Format: YYYY/YYYY</p>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-secondary mb-2">
                Date de début <span className="text-error">*</span>
              </label>
              <Input
                id="start_date"
                name="start_date"
                type="date"
                value={formData.start_date}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-secondary mb-2">
                Date de fin <span className="text-error">*</span>
              </label>
              <Input
                id="end_date"
                name="end_date"
                type="date"
                value={formData.end_date}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Capacité maximale */}
          <div>
            <label htmlFor="max_students" className="block text-sm font-medium text-secondary mb-2">
              Nombre maximum d'élèves (optionnel)
            </label>
            <Input
              id="max_students"
              name="max_students"
              type="number"
              value={formData.max_students}
              onChange={handleChange}
              placeholder="Ex: 20"
              min="1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Laissez vide pour une capacité illimitée
            </p>
          </div>

          {/* Statut */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-secondary mb-2">
              Statut <span className="text-error">*</span>
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
              className="input w-full"
            >
              <option value="planned">Planifiée</option>
              <option value="ongoing">En cours</option>
              <option value="completed">Terminée</option>
              <option value="cancelled">Annulée</option>
            </select>
          </div>

          {/* Lien Zoom */}
          <div>
            <label htmlFor="zoom_link" className="block text-sm font-medium text-secondary mb-2">
              Lien Zoom (optionnel)
            </label>
            <Input
              id="zoom_link"
              name="zoom_link"
              type="url"
              value={formData.zoom_link}
              onChange={handleChange}
              placeholder="https://zoom.us/j/..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Lien de la salle Zoom permanente pour cette classe
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 pt-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Création en cours...' : 'Créer la classe'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin/classes')}
            >
              Annuler
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
