'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, Button, Input, Badge, Modal } from '@/components/ui';
import { classesApi } from '@/lib/api/classes';
import { ClassModel, ClassStudent, ProgramSchedule } from '@/lib/types';

const DAY_SHORT: Record<string, string> = {
  lundi: 'Lun',
  mardi: 'Mar',
  mercredi: 'Mer',
  jeudi: 'Jeu',
  vendredi: 'Ven',
  samedi: 'Sam',
  dimanche: 'Dim',
};

const formatTime = (time: string) => {
  const [h, m] = time.split(':');
  return m === '00' ? `${parseInt(h, 10)}h` : `${parseInt(h, 10)}h${m}`;
};

const formatSchedule = (schedule?: ProgramSchedule[] | null): string => {
  if (!schedule || schedule.length === 0) return 'Aucun horaire';
  const groups = new Map<string, string[]>();
  schedule.forEach((slot) => {
    const key = `${slot.start_time}-${slot.end_time}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(DAY_SHORT[slot.day] || slot.day);
  });
  return Array.from(groups.entries())
    .map(([range, days]) => `${days.join(' & ')} ${formatTime(range.split('-')[0])}-${formatTime(range.split('-')[1])}`)
    .join(' · ');
};

const formatDate = (date?: string | null) =>
  date ? new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function ClassStudentsPage() {
  const params = useParams();
  const router = useRouter();
  const classId = parseInt(params.id as string);

  const [classData, setClassData] = useState<ClassModel | null>(null);
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<ClassStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState(1);

  // Modals state
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showChangeClassModal, setShowChangeClassModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<ClassStudent | null>(null);

  const loadClass = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');

      const classResponse = await classesApi.getById(classId);
      setClassData(classResponse);
    } catch (err: unknown) {
      console.error('Failed to load class:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des donnees.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [classId]);

  const loadStudents = useCallback(async () => {
    try {
      setIsLoadingStudents(true);
      const studentsResponse = await classesApi.getStudents(classId, selectedLevel);
      setStudents(studentsResponse || []);
    } catch (err: unknown) {
      console.error('Failed to load students:', err);
      setStudents([]);
    } finally {
      setIsLoadingStudents(false);
    }
  }, [classId, selectedLevel]);

  const filterStudents = useCallback(() => {
    if (!searchQuery) {
      setFilteredStudents(students);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = students.filter((student) => {
      return (
        student.first_name?.toLowerCase().includes(query) ||
        student.last_name?.toLowerCase().includes(query) ||
        student.email?.toLowerCase().includes(query) ||
        student.student_profile?.phone?.toLowerCase().includes(query)
      );
    });

    setFilteredStudents(filtered);
  }, [searchQuery, students]);

  useEffect(() => {
    loadClass();
  }, [loadClass]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    filterStudents();
  }, [filterStudents]);

  const handleViewProfile = (student: ClassStudent) => {
    router.push(`/admin/users/${student.id}`);
  };

  const openRemoveModal = (student: ClassStudent) => {
    setSelectedStudent(student);
    setShowRemoveModal(true);
  };

  const openChangeClassModal = (student: ClassStudent) => {
    setSelectedStudent(student);
    setShowChangeClassModal(true);
  };

  const handleRemoveStudent = async () => {
    if (!selectedStudent) return;

    try {
      alert('Fonctionnalite de retrait en cours de developpement');
      setShowRemoveModal(false);
      setSelectedStudent(null);
    } catch (err: unknown) {
      console.error('Failed to remove student:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du retrait de l\'eleve.';
      alert(errorMessage);
    }
  };

  const handleChangeClass = async () => {
    if (!selectedStudent) return;

    try {
      alert('Fonctionnalite de changement de classe en cours de developpement');
      setShowChangeClassModal(false);
      setSelectedStudent(null);
    } catch (err: unknown) {
      console.error('Failed to change class:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du changement de classe.';
      alert(errorMessage);
    }
  };

  // Niveaux disponibles pour cette classe : niveau 1 (base) + niveaux activés, triés.
  const availableLevels = [
    { number: 1, name: 'Niveau de base' },
    ...(classData?.level_activations || [])
      .filter((a) => a.program_level)
      .map((a) => ({ number: a.program_level!.level_number, name: a.program_level!.name }))
      .sort((a, b) => a.number - b.number),
  ].filter((lvl, idx, arr) => arr.findIndex((l) => l.number === lvl.number) === idx);

  const isReinscriptionView = selectedLevel > 1;

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center">
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="mb-6 p-4 bg-error/10 border border-error rounded-lg">
          <p className="text-error text-sm">{error}</p>
        </div>
        <Button onClick={() => router.push('/admin/classes')}>Retour aux classes</Button>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <Button variant="outline" onClick={() => router.push('/admin/classes')}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour
          </Button>
          <h1 className="font-playfair text-4xl font-semibold text-secondary">
            Eleves de la classe
          </h1>
        </div>
        {classData && (
          <div className="flex items-center gap-3">
            <p className="text-gray-600 text-lg">{classData.name}</p>
            <Badge variant="info">
              {classData.academic_year}
            </Badge>
          </div>
        )}
      </div>

      {/* Bloc info classe : période actuelle + horaires */}
      {classData && (
        <Card className="mb-6 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            {/* Programme */}
            <div className="p-6 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Programme</p>
                <p className="font-semibold text-secondary truncate">{classData.program?.name}</p>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {formatDate(classData.start_date)} → {formatDate(classData.end_date)}
                </p>
              </div>
            </div>

            {/* Niveau actuel */}
            <div className="p-6 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Niveau actuel</p>
                {classData.current_period ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-7 h-7 bg-primary text-white rounded-full font-bold text-sm">
                        {classData.current_period.level_number}
                      </span>
                      <span className="font-semibold text-secondary text-sm">
                        {classData.current_period.level_number === 1
                          ? 'Niveau de base'
                          : classData.current_period.level_name}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDate(classData.current_period.start_date)} → {formatDate(classData.current_period.end_date)}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-400">—</p>
                )}
              </div>
            </div>

            {/* Horaires du niveau actuel */}
            <div className="p-6 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Horaires</p>
                {classData.current_period?.schedule ? (
                  <p className="font-semibold text-secondary text-sm leading-relaxed">
                    {formatSchedule(classData.current_period.schedule)}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400">Aucun horaire défini</p>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Statistiques */}
      {classData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {isReinscriptionView ? (
            <>
              <Card>
                <div className="p-6">
                  <p className="text-sm text-gray-600 mb-1">Eleves reinscrits</p>
                  <p className="text-3xl font-bold text-primary">{students.length}</p>
                </div>
              </Card>
              <Card>
                <div className="p-6">
                  <p className="text-sm text-gray-600 mb-1">Paye integralement</p>
                  <p className="text-3xl font-bold text-success">
                    {students.filter((s) => s.payment_status === 'paid').length}
                  </p>
                </div>
              </Card>
              <Card>
                <div className="p-6">
                  <p className="text-sm text-gray-600 mb-1">En cours de paiement</p>
                  <p className="text-3xl font-bold text-warning">
                    {students.filter((s) => s.payment_status === 'partial').length}
                  </p>
                </div>
              </Card>
            </>
          ) : (
            <>
              <Card>
                <div className="p-6">
                  <p className="text-sm text-gray-600 mb-1">Eleves inscrits</p>
                  <p className="text-3xl font-bold text-primary">{students.length}</p>
                </div>
              </Card>
              <Card>
                <div className="p-6">
                  <p className="text-sm text-gray-600 mb-1">Capacite maximale</p>
                  <p className="text-3xl font-bold text-secondary">
                    {classData.max_students || '∞'}
                  </p>
                </div>
              </Card>
              <Card>
                <div className="p-6">
                  <p className="text-sm text-gray-600 mb-1">Places restantes</p>
                  <p className="text-3xl font-bold text-success">
                    {classData.max_students
                      ? classData.max_students - students.length
                      : '∞'}
                  </p>
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Sélecteur de niveau (uniquement si la classe a des niveaux supérieurs activés) */}
      {availableLevels.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {availableLevels.map((lvl) => {
            const active = selectedLevel === lvl.number;
            return (
              <button
                key={lvl.number}
                onClick={() => setSelectedLevel(lvl.number)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                  active
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-white text-secondary border-gray-200 hover:border-primary/40 hover:bg-primary/5'
                }`}
              >
                <span
                  className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                    active ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                  }`}
                >
                  {lvl.number}
                </span>
                {lvl.number === 1 ? 'Niveau de base' : lvl.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Barre de recherche */}
      <Card>
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Rechercher un eleve (nom, prenom, email, telephone)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={() => setSearchQuery('')}>
              Reinitialiser
            </Button>
          </div>

          {/* Table des eleves */}
          {isLoadingStudents ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Chargement...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">
                {searchQuery
                  ? 'Aucun eleve trouve avec ces criteres.'
                  : isReinscriptionView
                    ? 'Aucun eleve reinscrit a ce niveau pour le moment.'
                    : 'Aucun eleve inscrit dans cette classe.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                      Eleve
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                      Telephone
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                      {isReinscriptionView ? 'Date reinscription' : 'Date inscription'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                      Statut
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredStudents.map((student) => {
                    const fullName = `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'N/A';
                    const initials = `${student.first_name?.[0] || ''}${student.last_name?.[0] || ''}`;

                    return (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                              {initials}
                            </div>
                            <div>
                              <p className="font-medium text-secondary">{fullName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {student.email || 'N/A'}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {student.student_profile?.phone || 'N/A'}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {new Date(student.enrolled_at).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-4 py-4">
                          {isReinscriptionView && student.payment_status ? (
                            <Badge variant={student.payment_status === 'paid' ? 'success' : 'warning'}>
                              {student.payment_status === 'paid' ? 'Paye' : 'En cours de paiement'}
                            </Badge>
                          ) : (
                            <Badge variant={student.enrollment_status === 'active' ? 'success' : 'warning'}>
                              {student.enrollment_status === 'active' ? 'Actif' : student.enrollment_status}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => handleViewProfile(student)}
                              title="Voir la fiche"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => openChangeClassModal(student)}
                              title="Changer de classe"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                                />
                              </svg>
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => openRemoveModal(student)}
                              title="Retirer de la classe"
                            >
                              <svg
                                className="w-4 h-4 text-error"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* Modal de retrait */}
      <Modal
        isOpen={showRemoveModal}
        onClose={() => setShowRemoveModal(false)}
        title="Retirer l eleve de la classe"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Etes-vous sur de vouloir retirer{' '}
            <span className="font-bold">
              {selectedStudent?.first_name} {selectedStudent?.last_name}
            </span>{' '}
            de cette classe ?
          </p>
          <p className="text-sm text-error">
            Cette action ne supprimera pas l eleve de la plateforme, mais le desinscrit de cette
            classe uniquement.
          </p>
          <div className="flex items-center gap-4 pt-4">
            <Button variant="outline" onClick={() => setShowRemoveModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleRemoveStudent}>Confirmer le retrait</Button>
          </div>
        </div>
      </Modal>

      {/* Modal de changement de classe */}
      <Modal
        isOpen={showChangeClassModal}
        onClose={() => setShowChangeClassModal(false)}
        title="Changer l eleve de classe"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Transferer{' '}
            <span className="font-bold">
              {selectedStudent?.first_name} {selectedStudent?.last_name}
            </span>{' '}
            vers une autre classe
          </p>
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              Nouvelle classe
            </label>
            <select className="input w-full">
              <option value="">Selectionner une classe...</option>
            </select>
          </div>
          <div className="flex items-center gap-4 pt-4">
            <Button variant="outline" onClick={() => setShowChangeClassModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleChangeClass}>Changer de classe</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
