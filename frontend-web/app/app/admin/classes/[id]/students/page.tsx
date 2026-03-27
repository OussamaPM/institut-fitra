'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, Button, Input, Badge, Modal } from '@/components/ui';
import { classesApi } from '@/lib/api/classes';
import { ClassModel, ClassStudent } from '@/lib/types';

export default function ClassStudentsPage() {
  const params = useParams();
  const router = useRouter();
  const classId = parseInt(params.id as string);

  const [classData, setClassData] = useState<ClassModel | null>(null);
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<ClassStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showChangeClassModal, setShowChangeClassModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<ClassStudent | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');

      // Charger les donnees de la classe
      const classResponse = await classesApi.getById(classId);
      setClassData(classResponse);

      // Charger la liste des eleves
      const studentsResponse = await classesApi.getStudents(classId);
      setStudents(studentsResponse || []);
      setFilteredStudents(studentsResponse || []);
    } catch (err: unknown) {
      console.error('Failed to load data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des donnees.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [classId]);

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
    loadData();
  }, [loadData]);

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

      {/* Statistiques */}
      {classData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
          <Card>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-1">Programme</p>
              <p className="text-sm font-medium text-secondary truncate">
                {classData.program?.name}
              </p>
            </div>
          </Card>
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
          {filteredStudents.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">
                {searchQuery
                  ? 'Aucun eleve trouve avec ces criteres.'
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
                      Date inscription
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
                          <Badge variant={student.enrollment_status === 'active' ? 'success' : 'warning'}>
                            {student.enrollment_status === 'active' ? 'Actif' : student.enrollment_status}
                          </Badge>
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
