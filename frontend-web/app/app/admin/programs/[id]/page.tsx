'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Badge } from '@/components/ui';
import { programsApi } from '@/lib/api/programs';
import { programLevelsApi } from '@/lib/api/program-levels';
import { Program, ProgramLevel } from '@/lib/types';

export default function ProgramDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const programId = parseInt(params.id as string);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [program, setProgram] = useState<Program | null>(null);
  const [levels, setLevels] = useState<ProgramLevel[]>([]);
  const [activatingLevel, setActivatingLevel] = useState<number | null>(null);

  // Modal d'activation
  const [activateModal, setActivateModal] = useState<{ level: ProgramLevel } | null>(null);
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);
  const [activateLoading, setActivateLoading] = useState(false);
  const [activateConfirm, setActivateConfirm] = useState<{ count: number } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [programData, levelsData] = await Promise.all([
          programsApi.getById(programId),
          programLevelsApi.getByProgram(programId),
        ]);
        setProgram(programData);
        setLevels(levelsData.levels);
      } catch (err: any) {
        console.error('Failed to fetch program:', err);
        setError('Impossible de charger le programme.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [programId]);

  const openActivateModal = (level: ProgramLevel) => {
    setActivateModal({ level });
    setSelectedClassIds([]);
    setActivateConfirm(null);
  };

  const closeActivateModal = () => {
    setActivateModal(null);
    setSelectedClassIds([]);
    setActivateConfirm(null);
  };

  const toggleClassSelection = (classId: number) => {
    setSelectedClassIds(prev =>
      prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
    );
  };

  const handleActivateLevel = async (confirmed = false) => {
    if (!activateModal) return;
    if (selectedClassIds.length === 0) return;

    setActivateLoading(true);
    try {
      const response = await programLevelsApi.activate(programId, activateModal.level.id, {
        class_ids: selectedClassIds,
        confirmed,
      });

      if (response.requires_confirmation && !confirmed) {
        setActivateConfirm({ count: response.eligible_students_count ?? 0 });
        return;
      }

      if (response.level) {
        setLevels(prev => prev.map(l => l.id === activateModal.level.id ? { ...l, ...response.level! } : l));
      }
      closeActivateModal();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de l\'activation.');
    } finally {
      setActivateLoading(false);
    }
  };

  const handleDeactivateForClass = async (level: ProgramLevel, classId: number, className: string) => {
    if (!confirm(`Désactiver "${level.name}" pour la classe "${className}" ?`)) return;
    setActivatingLevel(level.id);
    try {
      const response = await programLevelsApi.deactivate(programId, level.id, { class_id: classId });
      if (response.level) {
        setLevels(prev => prev.map(l => l.id === level.id ? { ...l, ...response.level! } : l));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de la désactivation.');
    } finally {
      setActivatingLevel(null);
    }
  };

  const handleDeleteLevel = async (level: ProgramLevel) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le ${level.name} ?`)) return;

    try {
      await programLevelsApi.delete(programId, level.id);
      setLevels(prev => prev.filter(l => l.id !== level.id));
    } catch (err: any) {
      console.error('Failed to delete level:', err);
      alert(err.response?.data?.message || 'Impossible de supprimer ce niveau.');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const getDayLabel = (day: string) => {
    const days: Record<string, string> = {
      lundi: 'Lun',
      mardi: 'Mar',
      mercredi: 'Mer',
      jeudi: 'Jeu',
      vendredi: 'Ven',
      samedi: 'Sam',
      dimanche: 'Dim',
    };
    return days[day] || day;
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

  if (error || !program) {
    return (
      <div className="p-8">
        <div className="bg-error/10 border border-error rounded-lg p-4">
          <p className="text-error">{error || 'Programme introuvable.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header compact */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-primary hover:underline mb-3 flex items-center gap-1 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </button>

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <h1 className="font-playfair text-2xl md:text-3xl font-semibold text-secondary">
              {program.name}
            </h1>
            <Badge variant={program.active ? 'success' : 'neutral'}>
              {program.active ? 'Actif' : 'Inactif'}
            </Badge>
          </div>

          <Link href={`/admin/programs/${program.id}/edit`}>
            <Button variant="primary">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Modifier le programme
            </Button>
          </Link>
        </div>

        <p className="text-gray-600 mt-2">{program.subject} • {formatPrice(program.price)}</p>
      </div>

      {/* Zone critique : Classe d'affectation */}
      <Card className="mb-6">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                program.default_class ? 'bg-green-100' : 'bg-amber-100'
              }`}>
                {program.default_class ? (
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
                <p className="font-medium text-secondary">Classe d'affectation par défaut</p>
                {program.default_class ? (
                  <p className="text-sm text-green-600">
                    {program.default_class.name} ({program.default_class.academic_year})
                  </p>
                ) : (
                  <p className="text-sm text-amber-600">
                    Non configurée - Les inscriptions sont bloquées
                  </p>
                )}
              </div>
            </div>
            <Link href={`/admin/programs/${program.id}/edit`}>
              <Button variant="outline" size="sm">
                Configurer
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Grille principale */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche : Niveaux + Emploi du temps */}
        <div className="lg:col-span-2 space-y-6">
          {/* Niveaux du programme */}
          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-secondary">Niveaux du programme</h2>
                <Link href={`/admin/programs/${program.id}/edit#levels`}>
                  <Button variant="outline" size="sm">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Ajouter
                  </Button>
                </Link>
              </div>

              <div className="space-y-2">
                {/* Niveau 1 = Programme principal */}
                <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center font-bold text-xs">
                      1
                    </div>
                    <div>
                      <p className="font-medium text-sm text-secondary">{program.name}</p>
                      <p className="text-xs text-gray-500">Programme principal</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-primary">{formatPrice(program.price)}</p>
                  </div>
                </div>

                {/* Niveaux supérieurs */}
                {levels.map((level) => (
                  <div
                    key={level.id}
                    className={`p-3 border rounded-lg ${
                      level.is_active ? 'border-green-200 bg-green-50' : 'border-gray-200'
                    }`}
                  >
                    {/* Ligne principale */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            level.is_active ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'
                          }`}
                        >
                          {level.level_number}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-secondary">{level.name}</p>
                          <p className="text-xs text-gray-500">
                            {level.enrollments_count || 0} inscrit(s)
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-primary">{formatPrice(level.price)}</p>
                        <Badge variant={level.is_active ? 'success' : 'neutral'} className="text-xs">
                          {level.is_active ? 'Actif' : 'Inactif'}
                        </Badge>

                        {/* Bouton Modifier */}
                        <Link href={`/admin/programs/${programId}/edit#levels`}>
                          <button
                            className="p-1.5 rounded transition-colors text-blue-600 hover:bg-blue-100"
                            title="Modifier ce niveau"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </Link>

                        {/* Bouton Activer (toujours visible pour ajouter des classes) */}
                        <button
                          onClick={() => openActivateModal(level)}
                          className="p-1.5 rounded transition-colors text-green-600 hover:bg-green-100"
                          title="Activer pour une classe"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>

                        {/* Bouton Supprimer */}
                        <button
                          onClick={() => handleDeleteLevel(level)}
                          disabled={level.has_enrollments}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={level.has_enrollments ? 'Impossible (élèves inscrits)' : 'Supprimer'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Classes actives pour ce niveau */}
                    {level.is_active && level.activations && level.activations.length > 0 && (
                      <div className="mt-2.5 pt-2.5 border-t border-green-200 flex flex-wrap gap-1.5 items-center">
                        <span className="text-xs text-green-700 font-medium mr-1">Actif dans :</span>
                        {level.activations.map((activation) => {
                          const className = activation.class?.name ?? `Classe #${activation.class_id}`;
                          return (
                            <span
                              key={activation.id}
                              className="inline-flex items-center gap-1.5 pl-2 pr-1 py-0.5 bg-white border border-green-300 text-green-800 rounded-full text-xs font-medium"
                            >
                              <svg className="w-2.5 h-2.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              {className}
                              <button
                                onClick={() => handleDeactivateForClass(level, activation.class_id, className)}
                                disabled={activatingLevel === level.id}
                                className="ml-0.5 p-0.5 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors disabled:opacity-50"
                                title={`Désactiver pour ${className}`}
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}

                {levels.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Aucun niveau supplémentaire
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Emploi du temps compact */}
          <Card>
            <div className="p-4">
              <h2 className="font-semibold text-secondary mb-3">Emploi du temps</h2>
              {program.schedule && program.schedule.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {program.schedule.map((slot, index) => (
                    <div key={index} className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm">
                      <span className="font-medium text-secondary">{getDayLabel(slot.day)}</span>
                      <span className="text-gray-500">{slot.start_time} - {slot.end_time}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Aucun horaire défini</p>
              )}
            </div>
          </Card>

          {/* Description */}
          <Card>
            <div className="p-4">
              <h2 className="font-semibold text-secondary mb-3">Description</h2>
              <p className="text-gray-700 text-sm whitespace-pre-wrap">{program.description}</p>
            </div>
          </Card>

          {/* Matière */}
          {program.subject_description && (
            <Card>
              <div className="p-4">
                <h2 className="font-semibold text-secondary mb-3">Matière</h2>
                <p className="font-medium text-sm mb-1">{program.subject}</p>
                <p className="text-xs text-gray-600">{program.subject_description}</p>
              </div>
            </Card>
          )}
        </div>

        {/* Colonne droite : Infos secondaires */}
        <div className="space-y-6">
          {/* Enseignant */}
          {program.teacher && (
            <Card>
              <div className="p-4">
                <h2 className="font-semibold text-secondary mb-3">Enseignant</h2>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary font-bold text-sm">
                      {program.teacher.teacher_profile?.first_name?.[0]}
                      {program.teacher.teacher_profile?.last_name?.[0]}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-sm text-secondary">
                      {program.teacher.teacher_profile?.first_name} {program.teacher.teacher_profile?.last_name}
                    </p>
                    <p className="text-xs text-gray-500">{program.teacher.email}</p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Tarification */}
          <Card>
            <div className="p-4">
              <h2 className="font-semibold text-secondary mb-3">Tarification</h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Prix</span>
                  <span className="font-bold text-primary">{formatPrice(program.price)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Paiement</span>
                  <Badge variant={program.max_installments > 1 ? 'success' : 'info'} className="text-xs">
                    {program.max_installments === 1 ? 'Unique' : `En ${program.max_installments}×`}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>

          {/* Conditions d'inscription */}
          {program.enrollment_conditions && (
            <Card>
              <div className="p-4">
                <h2 className="font-semibold text-secondary mb-3">Conditions d'inscription</h2>
                <p className="text-gray-700 text-sm whitespace-pre-wrap">{program.enrollment_conditions}</p>
              </div>
            </Card>
          )}

          {/* Infos */}
          <Card>
            <div className="p-4">
              <h2 className="font-semibold text-secondary mb-3">Informations</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">ID</span>
                  <span className="font-mono">#{program.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Créé le</span>
                  <span>{new Date(program.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Modal d'activation de niveau */}
      {activateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b">
              <h3 className="font-semibold text-secondary text-lg">
                Activer — {activateModal.level.name}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Sélectionnez la ou les classes pour lesquelles activer ce niveau.
              </p>
            </div>

            <div className="p-5 space-y-2 max-h-72 overflow-y-auto">
              {program?.classes && program.classes.length > 0 ? (
                program.classes.map((cls) => {
                  const alreadyActive = activateModal.level.activations?.some(a => a.class_id === cls.id);
                  return (
                    <label
                      key={cls.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        alreadyActive
                          ? 'opacity-50 cursor-not-allowed bg-gray-50'
                          : selectedClassIds.includes(cls.id)
                          ? 'border-green-400 bg-green-50'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedClassIds.includes(cls.id)}
                        disabled={alreadyActive}
                        onChange={() => toggleClassSelection(cls.id)}
                        className="w-4 h-4 accent-green-600"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-secondary truncate">{cls.name}</p>
                        <p className="text-xs text-gray-500">{cls.academic_year}</p>
                      </div>
                      {alreadyActive && (
                        <span className="text-xs text-green-600 font-medium shrink-0">Déjà actif</span>
                      )}
                    </label>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  Aucune classe disponible pour ce programme.
                </p>
              )}
            </div>

            {/* Étape de confirmation */}
            {activateConfirm && (
              <div className="mx-5 mb-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <strong>{activateConfirm.count} élève(s)</strong> seront notifiés par email. Confirmer l'activation ?
              </div>
            )}

            <div className="p-5 border-t flex justify-end gap-3">
              <button
                onClick={closeActivateModal}
                className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleActivateLevel(activateConfirm ? true : false)}
                disabled={selectedClassIds.length === 0 || activateLoading}
                className="px-4 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {activateLoading && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {activateConfirm ? 'Confirmer et envoyer les emails' : 'Activer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
