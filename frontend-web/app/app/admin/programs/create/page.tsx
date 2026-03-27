'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Input } from '@/components/ui';
import { programsApi } from '@/lib/api/programs';
import { ProgramSchedule, User } from '@/lib/types';

export default function CreateProgramPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [teachers, setTeachers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    max_installments: '1',
    teacher_id: '',
    subject: '',
    subject_description: '',
    enrollment_conditions: '',
    active: true,
  });
  const [schedule, setSchedule] = useState<ProgramSchedule[]>([
    { day: 'lundi', start_time: '09:00', end_time: '11:00' },
  ]);

  // Charger la liste des enseignants (teachers + admins)
  useEffect(() => {
    const loadTeachers = async () => {
      try {
        const teachersList = await programsApi.getTeachers();
        setTeachers(teachersList);
      } catch (err) {
        console.error('Failed to load teachers:', err);
      }
    };

    loadTeachers();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value,
    });
  };

  const handleScheduleChange = (index: number, field: keyof ProgramSchedule, value: string) => {
    const newSchedule = [...schedule];
    newSchedule[index] = { ...newSchedule[index], [field]: value };
    setSchedule(newSchedule);
  };

  const addScheduleSlot = () => {
    setSchedule([...schedule, { day: 'lundi', start_time: '09:00', end_time: '11:00' }]);
  };

  const removeScheduleSlot = (index: number) => {
    if (schedule.length > 1) {
      setSchedule(schedule.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name || !formData.description || !formData.price || !formData.teacher_id || !formData.subject) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (schedule.length === 0) {
      setError('Veuillez ajouter au moins un horaire.');
      return;
    }

    setIsLoading(true);

    try {
      const dataToSend = {
        ...formData,
        price: parseFloat(formData.price),
        max_installments: parseInt(formData.max_installments),
        teacher_id: parseInt(formData.teacher_id),
        schedule,
      };

      await programsApi.create(dataToSend);
      router.push('/admin/programs');
    } catch (err: any) {
      console.error('Failed to create program:', err);
      setError(err.response?.data?.message || 'Impossible de créer le programme.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-primary hover:underline mb-4 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </button>
        <h1 className="font-playfair text-4xl font-semibold text-secondary mb-2">
          Créer un programme
        </h1>
        <p className="text-gray-600">
          Ajoutez un nouveau programme de formation à la plateforme
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error rounded-lg">
          <p className="text-error text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Informations générales */}
        <Card className="mb-6">
          <div className="p-6">
            <h2 className="font-playfair text-xl font-semibold text-secondary mb-4">
              Informations générales
            </h2>

            <div className="space-y-4">
              <Input
                label="Titre du programme *"
                type="text"
                name="name"
                id="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="ex: Programme de Sciences Islamiques"
                required
                disabled={isLoading}
              />

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-secondary mb-1">
                  Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Décrivez le programme..."
                  rows={4}
                  className="input w-full"
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="teacher_id" className="block text-sm font-medium text-secondary mb-1">
                  Enseignant *
                </label>
                <select
                  id="teacher_id"
                  name="teacher_id"
                  value={formData.teacher_id}
                  onChange={handleChange}
                  className="input w-full"
                  required
                  disabled={isLoading}
                >
                  <option value="">Sélectionner un enseignant</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.role === 'admin' ? '👤 Admin - ' : ''}
                      {teacher.teacher_profile?.first_name} {teacher.teacher_profile?.last_name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Les administrateurs peuvent également enseigner
                </p>
              </div>

              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  id="active"
                  name="active"
                  checked={formData.active}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                  disabled={isLoading}
                />
                <label htmlFor="active" className="text-sm font-medium text-secondary">
                  Programme actif (visible par les élèves)
                </label>
              </div>
            </div>
          </div>
        </Card>

        {/* Matière */}
        <Card className="mb-6">
          <div className="p-6">
            <h2 className="font-playfair text-xl font-semibold text-secondary mb-4">
              Matière enseignée
            </h2>

            <div className="space-y-4">
              <Input
                label="Nom de la matière *"
                type="text"
                name="subject"
                id="subject"
                value={formData.subject}
                onChange={handleChange}
                placeholder="ex: Grammaire Arabe, Tajwid, Fiqh"
                required
                disabled={isLoading}
              />

              <div>
                <label htmlFor="subject_description" className="block text-sm font-medium text-secondary mb-1">
                  Descriptif de la matière
                </label>
                <textarea
                  id="subject_description"
                  name="subject_description"
                  value={formData.subject_description}
                  onChange={handleChange}
                  placeholder="Détails sur le contenu de la matière enseignée..."
                  rows={3}
                  className="input w-full"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Emploi du temps */}
        <Card className="mb-6">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-playfair text-xl font-semibold text-secondary">
                Emploi du temps *
              </h2>
              <Button type="button" variant="outline" size="sm" onClick={addScheduleSlot} disabled={isLoading}>
                + Ajouter un horaire
              </Button>
            </div>

            <div className="space-y-4">
              {schedule.map((slot, index) => (
                <div key={index} className="flex items-end gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Jour
                    </label>
                    <select
                      value={slot.day}
                      onChange={(e) => handleScheduleChange(index, 'day', e.target.value)}
                      className="input w-full"
                      disabled={isLoading}
                    >
                      <option value="lundi">Lundi</option>
                      <option value="mardi">Mardi</option>
                      <option value="mercredi">Mercredi</option>
                      <option value="jeudi">Jeudi</option>
                      <option value="vendredi">Vendredi</option>
                      <option value="samedi">Samedi</option>
                      <option value="dimanche">Dimanche</option>
                    </select>
                  </div>

                  <div className="flex-1">
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Heure de début
                    </label>
                    <input
                      type="time"
                      value={slot.start_time}
                      onChange={(e) => handleScheduleChange(index, 'start_time', e.target.value)}
                      className="input w-full"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="flex-1">
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Heure de fin
                    </label>
                    <input
                      type="time"
                      value={slot.end_time}
                      onChange={(e) => handleScheduleChange(index, 'end_time', e.target.value)}
                      className="input w-full"
                      disabled={isLoading}
                    />
                  </div>

                  {schedule.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeScheduleSlot(index)}
                      disabled={isLoading}
                    >
                      Supprimer
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Tarification */}
        <Card className="mb-6">
          <div className="p-6">
            <h2 className="font-playfair text-xl font-semibold text-secondary mb-4">
              Tarification
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Prix (€) *"
                type="number"
                name="price"
                id="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="299.00"
                step="0.01"
                min="0"
                required
                disabled={isLoading}
              />

              <Input
                label="Nombre de paiements acceptés *"
                type="number"
                name="max_installments"
                id="max_installments"
                value={formData.max_installments}
                onChange={handleChange}
                helperText="1 = paiement unique, 2-12 = paiement en plusieurs fois"
                min="1"
                max="12"
                required
                disabled={isLoading}
              />
            </div>
          </div>
        </Card>

        {/* Conditions d'inscription */}
        <Card className="mb-6">
          <div className="p-6">
            <h2 className="font-playfair text-xl font-semibold text-secondary mb-4">
              Conditions d'inscription
            </h2>

            <div>
              <label htmlFor="enrollment_conditions" className="block text-sm font-medium text-secondary mb-1">
                Prérequis et conditions
              </label>
              <textarea
                id="enrollment_conditions"
                name="enrollment_conditions"
                value={formData.enrollment_conditions}
                onChange={handleChange}
                placeholder="ex: Avoir un niveau A2 en arabe, Connaître l'alphabet arabe..."
                rows={4}
                className="input w-full"
                disabled={isLoading}
              />
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button type="submit" disabled={isLoading} isLoading={isLoading}>
            {isLoading ? 'Création...' : 'Créer le programme'}
          </Button>
        </div>
      </form>
    </div>
  );
}
