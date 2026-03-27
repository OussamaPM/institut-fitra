'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, Button, Input } from '@/components/ui';
import { classesApi } from '@/lib/api/classes';
import { programsApi } from '@/lib/api/programs';
import { Program, ClassModel } from '@/lib/types';

export default function EditClassPage() {
  const router = useRouter();
  const params = useParams();
  const classId = Number(params.id);

  const [programs, setPrograms] = useState<Program[]>([]);
  const [programClasses, setProgramClasses] = useState<ClassModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    program_id: '',
    name: '',
    academic_year: '',
    start_date: '',
    end_date: '',
    max_students: '',
    status: 'planned' as 'planned' | 'ongoing' | 'completed' | 'cancelled',
    zoom_link: '',
    parent_class_id: '' as string,
  });

  useEffect(() => {
    loadData();
  }, [classId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [classData, programsResponse] = await Promise.all([
        classesApi.getById(classId),
        programsApi.getAll({ page: 1, per_page: 100 }),
      ]);

      setPrograms(programsResponse.data);
      setFormData({
        program_id: classData.program_id.toString(),
        name: classData.name,
        academic_year: classData.academic_year,
        start_date: classData.start_date.split('T')[0],
        end_date: classData.end_date.split('T')[0],
        max_students: classData.max_students?.toString() || '',
        status: classData.status,
        zoom_link: classData.zoom_link || '',
        parent_class_id: classData.parent_class_id?.toString() || '',
      });

      // Charger les classes du même programme (pour le sélecteur de classe parente)
      const classesResponse = await classesApi.getAll({
        program_id: classData.program_id,
        per_page: 100,
      });
      // Exclure la classe courante (ne peut pas être sa propre parente)
      setProgramClasses(classesResponse.data.filter((c) => c.id !== classId));
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Impossible de charger les données.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      const payload = {
        program_id: parseInt(formData.program_id),
        name: formData.name,
        academic_year: formData.academic_year,
        start_date: formData.start_date,
        end_date: formData.end_date,
        max_students: formData.max_students ? parseInt(formData.max_students) : undefined,
        status: formData.status,
        zoom_link: formData.zoom_link || undefined,
        parent_class_id: formData.parent_class_id ? parseInt(formData.parent_class_id) : null,
      };

      await classesApi.update(classId, payload);
      router.push('/admin/classes');
    } catch (err: any) {
      console.error('Failed to update class:', err);
      setError(err.response?.data?.message || 'Erreur lors de la modification de la classe.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-playfair text-4xl font-semibold text-secondary mb-2">
          Modifier la classe
        </h1>
        <p className="text-gray-600">
          Modifiez les informations de la classe
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
              onChange={handleChange}
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
          <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
            <p className="text-sm font-medium text-secondary mb-3">
              Classe précédente (suite d'une autre classe ?)
            </p>
            <select
              value={formData.parent_class_id}
              onChange={(e) => setFormData(prev => ({ ...prev, parent_class_id: e.target.value }))}
              className="input w-full"
            >
              <option value="">— Aucune (nouvelle cohorte)</option>
              {programClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} — {cls.academic_year}
                </option>
              ))}
            </select>
            {formData.parent_class_id && (
              <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                Cette classe sera affichée comme la suite de la classe sélectionnée.
              </p>
            )}
          </div>

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
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
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
