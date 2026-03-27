'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, Button, Input, Badge } from '@/components/ui';
import { programsApi } from '@/lib/api/programs';
import { programLevelsApi, CreateLevelData, ActivateLevelResponse } from '@/lib/api/program-levels';
import { Program, ProgramSchedule, ProgramLevel, ProgramLevelActivation, User, ClassModel } from '@/lib/types';

// Type pour les données d'un niveau en cours d'édition
interface LevelFormData {
  id?: number;
  name: string;
  description: string;
  price: string;
  max_installments: string;
  teacher_id: string;
  schedule: ProgramSchedule[];
  is_active: boolean;
  activations?: ProgramLevelActivation[];
  has_enrollments?: boolean;
  isNew?: boolean;
}

export default function EditProgramPage() {
  const router = useRouter();
  const params = useParams();
  const programId = parseInt(params.id as string);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [program, setProgram] = useState<Program | null>(null);
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
    default_class_id: '',
    active: true,
  });
  const [schedule, setSchedule] = useState<ProgramSchedule[]>([
    { day: 'lundi', start_time: '09:00', end_time: '11:00' },
  ]);

  // États pour les niveaux
  const [levels, setLevels] = useState<ProgramLevel[]>([]);
  const [expandedLevels, setExpandedLevels] = useState<Set<number>>(new Set());
  const [levelForms, setLevelForms] = useState<Map<number, LevelFormData>>(new Map());
  const [savingLevelId, setSavingLevelId] = useState<number | null>(null);
  const [levelError, setLevelError] = useState<string>('');

  // États pour l'activation des niveaux
  const [activatingLevelId, setActivatingLevelId] = useState<number | null>(null);
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);
  const [confirmActivation, setConfirmActivation] = useState<{ count: number; levelId: number } | null>(null);

  // Charger les données du programme, les enseignants et les niveaux
  useEffect(() => {
    const loadData = async () => {
      try {
        const [programData, teachersList, levelsResponse] = await Promise.all([
          programsApi.getById(programId),
          programsApi.getTeachers(),
          programLevelsApi.getByProgram(programId),
        ]);

        setProgram(programData);
        setTeachers(teachersList);
        setLevels(levelsResponse.levels);

        // Pré-remplir le formulaire
        setFormData({
          name: programData.name,
          description: programData.description,
          price: programData.price.toString(),
          max_installments: programData.max_installments.toString(),
          teacher_id: programData.teacher_id.toString(),
          subject: programData.subject,
          subject_description: programData.subject_description || '',
          enrollment_conditions: programData.enrollment_conditions || '',
          default_class_id: programData.default_class_id?.toString() || '',
          active: programData.active,
        });

        if (programData.schedule && programData.schedule.length > 0) {
          setSchedule(programData.schedule);
        }
      } catch (err: any) {
        console.error('Failed to load program:', err);
        setError('Impossible de charger le programme.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [programId]);

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

    setIsSaving(true);

    try {
      const dataToSend = {
        ...formData,
        price: parseFloat(formData.price),
        max_installments: parseInt(formData.max_installments),
        teacher_id: parseInt(formData.teacher_id),
        default_class_id: formData.default_class_id ? parseInt(formData.default_class_id) : undefined,
        schedule,
      };

      await programsApi.update(programId, dataToSend);
      router.push('/admin/programs');
    } catch (err: any) {
      console.error('Failed to update program:', err);
      setError(err.response?.data?.message || 'Impossible de mettre à jour le programme.');
    } finally {
      setIsSaving(false);
    }
  };

  // === Handlers pour les niveaux ===

  // Convertir un ProgramLevel en LevelFormData
  const levelToFormData = (level: ProgramLevel): LevelFormData => ({
    id: level.id,
    name: level.name,
    description: level.description || '',
    price: level.price.toString(),
    max_installments: level.max_installments.toString(),
    teacher_id: level.teacher_id?.toString() || '',
    schedule: level.schedule || [{ day: 'lundi', start_time: '09:00', end_time: '11:00' }],
    is_active: level.is_active,
    activations: level.activations || [],
    has_enrollments: level.has_enrollments,
    isNew: false,
  });

  // Créer un nouveau formulaire de niveau vierge
  const createNewLevelForm = (): LevelFormData => ({
    name: '',
    description: '',
    price: '',
    max_installments: '1',
    teacher_id: formData.teacher_id, // Par défaut, même enseignant que le programme
    schedule: [{ day: 'lundi', start_time: '09:00', end_time: '11:00' }],
    is_active: false,
    activations: [],
    isNew: true,
  });

  // Toggle l'accordéon d'un niveau
  const toggleLevelAccordion = (levelId: number) => {
    const newExpanded = new Set(expandedLevels);
    if (newExpanded.has(levelId)) {
      newExpanded.delete(levelId);
    } else {
      newExpanded.add(levelId);
      // Charger les données du formulaire si pas encore fait
      if (!levelForms.has(levelId)) {
        const level = levels.find(l => l.id === levelId);
        if (level) {
          const newForms = new Map(levelForms);
          newForms.set(levelId, levelToFormData(level));
          setLevelForms(newForms);
        }
      }
    }
    setExpandedLevels(newExpanded);
  };

  // Ajouter un nouveau niveau
  const addNewLevel = () => {
    // Utiliser un ID temporaire négatif pour les nouveaux niveaux
    const tempId = -Date.now();
    const newForms = new Map(levelForms);
    newForms.set(tempId, createNewLevelForm());
    setLevelForms(newForms);

    // Ouvrir automatiquement le nouvel accordéon
    const newExpanded = new Set(expandedLevels);
    newExpanded.add(tempId);
    setExpandedLevels(newExpanded);
  };

  // Mettre à jour un champ de formulaire de niveau
  const handleLevelFormChange = (levelId: number, field: keyof LevelFormData, value: any) => {
    const newForms = new Map(levelForms);
    const currentForm = newForms.get(levelId);
    if (currentForm) {
      newForms.set(levelId, { ...currentForm, [field]: value });
      setLevelForms(newForms);
    }
  };

  // Mettre à jour l'emploi du temps d'un niveau
  const handleLevelScheduleChange = (levelId: number, index: number, field: keyof ProgramSchedule, value: string) => {
    const newForms = new Map(levelForms);
    const currentForm = newForms.get(levelId);
    if (currentForm) {
      const newSchedule = [...currentForm.schedule];
      newSchedule[index] = { ...newSchedule[index], [field]: value };
      newForms.set(levelId, { ...currentForm, schedule: newSchedule });
      setLevelForms(newForms);
    }
  };

  // Ajouter un créneau à l'emploi du temps d'un niveau
  const addLevelScheduleSlot = (levelId: number) => {
    const newForms = new Map(levelForms);
    const currentForm = newForms.get(levelId);
    if (currentForm) {
      newForms.set(levelId, {
        ...currentForm,
        schedule: [...currentForm.schedule, { day: 'lundi', start_time: '09:00', end_time: '11:00' }],
      });
      setLevelForms(newForms);
    }
  };

  // Supprimer un créneau de l'emploi du temps d'un niveau
  const removeLevelScheduleSlot = (levelId: number, index: number) => {
    const newForms = new Map(levelForms);
    const currentForm = newForms.get(levelId);
    if (currentForm && currentForm.schedule.length > 1) {
      newForms.set(levelId, {
        ...currentForm,
        schedule: currentForm.schedule.filter((_, i) => i !== index),
      });
      setLevelForms(newForms);
    }
  };

  // Sauvegarder un niveau (création ou mise à jour)
  const saveLevel = async (levelId: number) => {
    const form = levelForms.get(levelId);
    if (!form) return;

    // Validation
    if (!form.name || !form.price) {
      setLevelError('Le nom et le prix sont obligatoires.');
      return;
    }

    setSavingLevelId(levelId);
    setLevelError('');

    try {
      const dataToSend: CreateLevelData = {
        name: form.name,
        description: form.description || undefined,
        price: parseFloat(form.price),
        max_installments: parseInt(form.max_installments) || 1,
        teacher_id: form.teacher_id ? parseInt(form.teacher_id) : undefined,
        schedule: form.schedule.length > 0 ? form.schedule : undefined,
      };

      let savedLevel: ProgramLevel;

      if (form.isNew) {
        // Créer un nouveau niveau
        savedLevel = await programLevelsApi.create(programId, dataToSend);

        // Supprimer le formulaire temporaire et ajouter le niveau à la liste
        const newForms = new Map(levelForms);
        newForms.delete(levelId);
        newForms.set(savedLevel.id, levelToFormData(savedLevel));
        setLevelForms(newForms);

        // Mettre à jour expandedLevels
        const newExpanded = new Set(expandedLevels);
        newExpanded.delete(levelId);
        newExpanded.add(savedLevel.id);
        setExpandedLevels(newExpanded);

        // Ajouter à la liste des niveaux
        setLevels([...levels, savedLevel]);
      } else {
        // Mettre à jour un niveau existant
        savedLevel = await programLevelsApi.update(programId, levelId, dataToSend);

        // Mettre à jour dans la liste
        setLevels(levels.map(l => l.id === levelId ? savedLevel : l));

        // Mettre à jour le formulaire
        const newForms = new Map(levelForms);
        newForms.set(levelId, levelToFormData(savedLevel));
        setLevelForms(newForms);
      }
    } catch (err: any) {
      console.error('Failed to save level:', err);
      setLevelError(err.response?.data?.message || 'Impossible de sauvegarder le niveau.');
    } finally {
      setSavingLevelId(null);
    }
  };

  // Supprimer un niveau
  const deleteLevel = async (levelId: number) => {
    const form = levelForms.get(levelId);

    // Si c'est un nouveau niveau non sauvegardé, juste le supprimer localement
    if (form?.isNew) {
      const newForms = new Map(levelForms);
      newForms.delete(levelId);
      setLevelForms(newForms);

      const newExpanded = new Set(expandedLevels);
      newExpanded.delete(levelId);
      setExpandedLevels(newExpanded);
      return;
    }

    // Vérifier s'il y a des inscriptions
    const level = levels.find(l => l.id === levelId);
    if (level?.has_enrollments) {
      setLevelError('Impossible de supprimer ce niveau car des élèves y sont inscrits.');
      return;
    }

    if (!confirm('Êtes-vous sûr de vouloir supprimer ce niveau ?')) {
      return;
    }

    setSavingLevelId(levelId);
    setLevelError('');

    try {
      await programLevelsApi.delete(programId, levelId);

      // Supprimer de la liste et des formulaires
      setLevels(levels.filter(l => l.id !== levelId));

      const newForms = new Map(levelForms);
      newForms.delete(levelId);
      setLevelForms(newForms);

      const newExpanded = new Set(expandedLevels);
      newExpanded.delete(levelId);
      setExpandedLevels(newExpanded);
    } catch (err: any) {
      console.error('Failed to delete level:', err);
      setLevelError(err.response?.data?.message || 'Impossible de supprimer le niveau.');
    } finally {
      setSavingLevelId(null);
    }
  };

  // Annuler les modifications d'un niveau
  const cancelLevelEdit = (levelId: number) => {
    const form = levelForms.get(levelId);

    // Si c'est un nouveau niveau, le supprimer
    if (form?.isNew) {
      const newForms = new Map(levelForms);
      newForms.delete(levelId);
      setLevelForms(newForms);
    } else {
      // Remettre les données originales
      const level = levels.find(l => l.id === levelId);
      if (level) {
        const newForms = new Map(levelForms);
        newForms.set(levelId, levelToFormData(level));
        setLevelForms(newForms);
      }
    }

    // Fermer l'accordéon
    const newExpanded = new Set(expandedLevels);
    newExpanded.delete(levelId);
    setExpandedLevels(newExpanded);
  };

  // Activer un niveau pour les classes sélectionnées
  const handleActivate = async (levelId: number, confirmed = false) => {
    if (selectedClassIds.length === 0) return;
    setActivatingLevelId(levelId);
    setLevelError('');
    try {
      const result = await programLevelsApi.activate(programId, levelId, {
        class_ids: selectedClassIds,
        confirmed,
      });
      if (result.requires_confirmation && result.eligible_students_count) {
        setConfirmActivation({ count: result.eligible_students_count, levelId });
        return;
      }
      // Mettre à jour le niveau dans la liste
      if (result.level) {
        setLevels(levels.map(l => l.id === levelId ? { ...l, ...result.level! } : l));
        const newForms = new Map(levelForms);
        const currentForm = newForms.get(levelId);
        if (currentForm && result.level.activations) {
          newForms.set(levelId, { ...currentForm, activations: result.level.activations, is_active: result.level.is_active });
          setLevelForms(newForms);
        }
      }
      setSelectedClassIds([]);
      setConfirmActivation(null);
    } catch (err: any) {
      setLevelError(err.response?.data?.message || 'Impossible d\'activer le niveau.');
    } finally {
      setActivatingLevelId(null);
    }
  };

  // Désactiver un niveau pour une classe (ou toutes)
  const handleDeactivate = async (levelId: number, classId?: number) => {
    setActivatingLevelId(levelId);
    setLevelError('');
    try {
      const result = await programLevelsApi.deactivate(programId, levelId, classId ? { class_id: classId } : {});
      if (result.level) {
        setLevels(levels.map(l => l.id === levelId ? { ...l, ...result.level! } : l));
        const newForms = new Map(levelForms);
        const currentForm = newForms.get(levelId);
        if (currentForm && result.level.activations !== undefined) {
          newForms.set(levelId, { ...currentForm, activations: result.level.activations, is_active: result.level.is_active });
          setLevelForms(newForms);
        }
      }
    } catch (err: any) {
      setLevelError(err.response?.data?.message || 'Impossible de désactiver le niveau.');
    } finally {
      setActivatingLevelId(null);
    }
  };

  // Obtenir tous les niveaux à afficher (existants + nouveaux)
  const getAllLevelsToDisplay = () => {
    const newLevelIds = Array.from(levelForms.keys()).filter(id => id < 0);

    return [
      ...levels.map(l => ({ id: l.id, level_number: l.level_number, isNew: false })),
      ...newLevelIds.map((id, index) => ({ id, level_number: levels.length + 2 + index, isNew: true })),
    ];
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="p-8">
        <div className="bg-error/10 border border-error rounded-lg p-4">
          <p className="text-error">Programme introuvable.</p>
        </div>
      </div>
    );
  }

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
          Modifier le programme
        </h1>
        <p className="text-gray-600">{program.name}</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error rounded-lg">
          <p className="text-error text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Classe d'affectation par défaut - Zone critique en haut */}
        <Card className={`mb-6 ${!formData.default_class_id ? 'border-amber-300 bg-amber-50/50' : 'border-green-300 bg-green-50/50'}`}>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                formData.default_class_id ? 'bg-green-100' : 'bg-amber-100'
              }`}>
                {formData.default_class_id ? (
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
              </div>
              <div>
                <h2 className="font-playfair text-xl font-semibold text-secondary">
                  Classe d'affectation par défaut
                </h2>
                <p className="text-sm text-gray-600">
                  {formData.default_class_id
                    ? 'Les inscriptions sont activées'
                    : 'Configurez une classe pour activer les inscriptions'}
                </p>
              </div>
            </div>

            <div>
              <select
                id="default_class_id"
                name="default_class_id"
                value={formData.default_class_id}
                onChange={handleChange}
                className="input w-full"
                disabled={isSaving}
              >
                <option value="">Aucune classe par défaut</option>
                {program?.classes?.map((cls: ClassModel) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.academic_year}) - {cls.status === 'ongoing' ? '🟢 En cours' : cls.status === 'planned' ? '🟡 Planifiée' : cls.status === 'completed' ? '✓ Terminée' : '❌ Annulée'}
                  </option>
                ))}
              </select>
              {(!program?.classes || program.classes.length === 0) && (
                <p className="text-sm text-amber-600 mt-2">
                  Aucune classe n'est associée à ce programme. Créez d'abord une classe pour pouvoir la définir par défaut.
                </p>
              )}
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
              <Button type="button" variant="outline" size="sm" onClick={addScheduleSlot} disabled={isSaving}>
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
                      disabled={isSaving}
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
                      disabled={isSaving}
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
                      disabled={isSaving}
                    />
                  </div>

                  {schedule.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeScheduleSlot(index)}
                      disabled={isSaving}
                    >
                      Supprimer
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>

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
                disabled={isSaving}
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
                  disabled={isSaving}
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
                  disabled={isSaving}
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
                  disabled={isSaving}
                />
                <label htmlFor="active" className="text-sm font-medium text-secondary">
                  Programme actif (visible par les élèves)
                </label>
              </div>
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
                disabled={isSaving}
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
                disabled={isSaving}
              />
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
                disabled={isSaving}
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
                  disabled={isSaving}
                />
              </div>
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
                disabled={isSaving}
              />
            </div>
          </div>
        </Card>

        {/* Actions du programme */}
        <div className="flex justify-end gap-4 mb-8">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSaving}
          >
            Annuler
          </Button>
          <Button type="submit" disabled={isSaving} isLoading={isSaving}>
            {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </Button>
        </div>
      </form>

      {/* Section Niveaux Supplémentaires (hors formulaire principal) */}
      <Card className="mb-8">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="font-playfair text-xl font-semibold text-secondary">
                Niveaux supplémentaires
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Le Niveau 1 correspond au programme principal ci-dessus. Créez ici les niveaux 2, 3, 4...
              </p>
            </div>
            <Button type="button" variant="outline" onClick={addNewLevel}>
              + Ajouter un niveau
            </Button>
          </div>

          {levelError && (
            <div className="mb-4 p-3 bg-error/10 border border-error rounded-lg">
              <p className="text-error text-sm">{levelError}</p>
            </div>
          )}

          {/* Niveau 1 - Programme principal (lecture seule) */}
          <div className="mb-4 border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-primary/5 border-b">
              <div className="flex items-center gap-3">
                <Badge variant="neutral">Niveau 1</Badge>
                <span className="font-medium text-secondary">{formData.name || 'Programme principal'}</span>
                <Badge variant="success">Principal</Badge>
              </div>
              <span className="text-sm text-gray-500">
                {formData.price ? `${parseFloat(formData.price).toFixed(2)} €` : '—'}
              </span>
            </div>
          </div>

          {/* Niveaux supplémentaires (accordion) */}
          {getAllLevelsToDisplay().map(({ id: levelId, level_number, isNew }) => {
            const level = levels.find(l => l.id === levelId);
            const form = levelForms.get(levelId);
            const isExpanded = expandedLevels.has(levelId);
            const isSavingThis = savingLevelId === levelId;

            return (
              <div key={levelId} className="mb-4 border rounded-lg overflow-hidden">
                {/* Header de l'accordéon */}
                <button
                  type="button"
                  onClick={() => toggleLevelAccordion(levelId)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <svg
                      className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <Badge variant={isNew ? 'warning' : 'neutral'}>Niveau {level_number}</Badge>
                    <span className="font-medium text-secondary">
                      {form?.name || level?.name || 'Nouveau niveau'}
                    </span>
                    {!isNew && level && (
                      <>
                        {level.is_active ? (
                          <Badge variant="success">Actif</Badge>
                        ) : (
                          <Badge variant="neutral">Inactif</Badge>
                        )}
                        {level.has_enrollments && (
                          <Badge variant="info">{level.enrollments_count} inscrit(s)</Badge>
                        )}
                      </>
                    )}
                    {isNew && <Badge variant="warning">Non enregistré</Badge>}
                  </div>
                  <span className="text-sm text-gray-500">
                    {form?.price || level?.price ? `${parseFloat(form?.price || level?.price?.toString() || '0').toFixed(2)} €` : '—'}
                  </span>
                </button>

                {/* Contenu de l'accordéon */}
                {isExpanded && form && (
                  <div className="p-6 border-t bg-white">
                    <div className="space-y-6">
                      {/* Informations de base */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Nom du niveau *"
                          type="text"
                          value={form.name}
                          onChange={(e) => handleLevelFormChange(levelId, 'name', e.target.value)}
                          placeholder={`ex: ${program?.name} - Niveau ${level_number}`}
                          disabled={isSavingThis}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <Input
                            label="Prix (€) *"
                            type="number"
                            value={form.price}
                            onChange={(e) => handleLevelFormChange(levelId, 'price', e.target.value)}
                            placeholder="299.00"
                            step="0.01"
                            min="0"
                            disabled={isSavingThis || (form.has_enrollments && !form.isNew)}
                            helperText={form.has_enrollments ? 'Non modifiable (inscriptions)' : ''}
                          />

                          <Input
                            label="Paiements max"
                            type="number"
                            value={form.max_installments}
                            onChange={(e) => handleLevelFormChange(levelId, 'max_installments', e.target.value)}
                            min="1"
                            max="12"
                            disabled={isSavingThis}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-secondary mb-1">
                          Description
                        </label>
                        <textarea
                          value={form.description}
                          onChange={(e) => handleLevelFormChange(levelId, 'description', e.target.value)}
                          placeholder="Description du niveau..."
                          rows={3}
                          className="input w-full"
                          disabled={isSavingThis}
                        />
                      </div>

                      {/* Enseignant */}
                      <div>
                        <label className="block text-sm font-medium text-secondary mb-1">
                          Enseignant
                        </label>
                        <select
                          value={form.teacher_id}
                          onChange={(e) => handleLevelFormChange(levelId, 'teacher_id', e.target.value)}
                          className="input w-full"
                          disabled={isSavingThis}
                        >
                          <option value="">Même que le programme principal</option>
                          {teachers.map((teacher) => (
                            <option key={teacher.id} value={teacher.id}>
                              {teacher.role === 'admin' ? '👤 Admin - ' : ''}
                              {teacher.teacher_profile?.first_name} {teacher.teacher_profile?.last_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Section Activation (uniquement pour les niveaux existants) */}
                      {!isNew && (
                        <div className="border rounded-lg p-4 bg-gray-50">
                          <h4 className="text-sm font-semibold text-secondary mb-3">Activation du niveau</h4>

                          {/* Activations existantes */}
                          {form.activations && form.activations.length > 0 ? (
                            <div className="mb-4 space-y-2">
                              <p className="text-xs text-gray-500 mb-2">Classes actives :</p>
                              {form.activations.map((activation) => (
                                <div key={activation.id} className="flex items-center justify-between bg-green-50 border border-green-200 rounded px-3 py-2">
                                  <span className="text-sm text-green-800 font-medium">
                                    {activation.class?.name} ({activation.class?.academic_year})
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeactivate(levelId, activation.class_id)}
                                    disabled={activatingLevelId === levelId}
                                    className="text-xs text-red-600 hover:text-red-800 hover:underline ml-3"
                                  >
                                    Retirer
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-amber-600 mb-3">Aucune classe active — les élèves ne peuvent pas se réinscrire.</p>
                          )}

                          {/* Sélection de nouvelles classes */}
                          {program?.classes && program.classes.length > 0 && (
                            <div>
                              <p className="text-xs text-gray-500 mb-2">Activer pour d'autres classes :</p>
                              <div className="space-y-1 mb-3 max-h-32 overflow-y-auto">
                                {program.classes
                                  .filter((cls: ClassModel) => !form.activations?.some(a => a.class_id === cls.id))
                                  .map((cls: ClassModel) => (
                                    <label key={cls.id} className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-white rounded">
                                      <input
                                        type="checkbox"
                                        checked={selectedClassIds.includes(cls.id)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedClassIds([...selectedClassIds, cls.id]);
                                          } else {
                                            setSelectedClassIds(selectedClassIds.filter(id => id !== cls.id));
                                          }
                                        }}
                                        className="w-4 h-4 text-primary"
                                      />
                                      <span className="text-sm text-secondary">{cls.name} ({cls.academic_year})</span>
                                    </label>
                                  ))}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleActivate(levelId)}
                                disabled={selectedClassIds.length === 0 || activatingLevelId === levelId}
                                className="w-full py-2 px-3 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {activatingLevelId === levelId ? 'Activation...' : `Activer pour ${selectedClassIds.length} classe(s)`}
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Modal de confirmation activation */}
                      {confirmActivation?.levelId === levelId && (
                        <div className="border border-amber-300 bg-amber-50 rounded-lg p-4">
                          <p className="text-sm text-amber-800 font-medium mb-3">
                            {confirmActivation.count} élève(s) vont recevoir un email de notification. Confirmer ?
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => { setConfirmActivation(null); setSelectedClassIds([]); }}
                              className="flex-1 py-1.5 px-3 border border-gray-300 text-sm rounded hover:bg-gray-100"
                            >
                              Annuler
                            </button>
                            <button
                              type="button"
                              onClick={() => handleActivate(levelId, true)}
                              className="flex-1 py-1.5 px-3 bg-primary text-white text-sm rounded hover:bg-primary/90"
                            >
                              Confirmer et envoyer les emails
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Emploi du temps */}
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <label className="block text-sm font-medium text-secondary">
                            Emploi du temps (optionnel)
                          </label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addLevelScheduleSlot(levelId)}
                            disabled={isSavingThis}
                          >
                            + Ajouter
                          </Button>
                        </div>

                        <div className="space-y-3">
                          {form.schedule.map((slot, index) => (
                            <div key={index} className="flex items-end gap-3 p-3 bg-gray-50 rounded-lg">
                              <div className="flex-1">
                                <label className="block text-xs text-gray-500 mb-1">Jour</label>
                                <select
                                  value={slot.day}
                                  onChange={(e) => handleLevelScheduleChange(levelId, index, 'day', e.target.value)}
                                  className="input w-full text-sm"
                                  disabled={isSavingThis}
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
                                <label className="block text-xs text-gray-500 mb-1">Début</label>
                                <input
                                  type="time"
                                  value={slot.start_time}
                                  onChange={(e) => handleLevelScheduleChange(levelId, index, 'start_time', e.target.value)}
                                  className="input w-full text-sm"
                                  disabled={isSavingThis}
                                />
                              </div>
                              <div className="flex-1">
                                <label className="block text-xs text-gray-500 mb-1">Fin</label>
                                <input
                                  type="time"
                                  value={slot.end_time}
                                  onChange={(e) => handleLevelScheduleChange(levelId, index, 'end_time', e.target.value)}
                                  className="input w-full text-sm"
                                  disabled={isSavingThis}
                                />
                              </div>
                              {form.schedule.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeLevelScheduleSlot(levelId, index)}
                                  className="p-2 text-error hover:bg-error/10 rounded"
                                  disabled={isSavingThis}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Actions du niveau */}
                      <div className="flex justify-between pt-4 border-t">
                        <div>
                          {!isNew && level && !level.has_enrollments && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => deleteLevel(levelId)}
                              disabled={isSavingThis}
                              className="text-error border-error hover:bg-error/10"
                            >
                              Supprimer ce niveau
                            </Button>
                          )}
                          {level?.has_enrollments && (
                            <span className="text-sm text-gray-500">
                              Suppression impossible (élèves inscrits)
                            </span>
                          )}
                        </div>

                        <div className="flex gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => cancelLevelEdit(levelId)}
                            disabled={isSavingThis}
                          >
                            Annuler
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => saveLevel(levelId)}
                            disabled={isSavingThis}
                            isLoading={isSavingThis}
                          >
                            {isNew ? 'Créer le niveau' : 'Enregistrer'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {levels.length === 0 && Array.from(levelForms.keys()).filter(id => id < 0).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>Aucun niveau supplémentaire configuré.</p>
              <p className="text-sm mt-1">Cliquez sur "Ajouter un niveau" pour créer le Niveau 2.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
