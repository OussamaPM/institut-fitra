'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { enrollmentsApi } from '@/lib/api/enrollments';
import { usersApi } from '@/lib/api/users';
import { programsApi } from '@/lib/api/programs';
import { classesApi } from '@/lib/api/classes';
import { User, Program, ClassModel } from '@/lib/types';
import Button from '@/components/ui/Button';

export default function CreateEnrollmentPage() {
  const router = useRouter();
  const [students, setStudents] = useState<User[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [classes, setClasses] = useState<ClassModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [studentId, setStudentId] = useState<string>('');
  const [programId, setProgramId] = useState<string>('');
  const [classId, setClassId] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [studentsData, programsResponse, classesResponse] = await Promise.all([
        usersApi.getAll({ role: 'student' }),
        programsApi.getAll(),
        classesApi.getAll(),
      ]);

      setStudents(Array.isArray(studentsData) ? studentsData : studentsData.data || []);
      setPrograms(Array.isArray(programsResponse) ? programsResponse : programsResponse.data || []);
      setClasses(Array.isArray(classesResponse) ? classesResponse : classesResponse.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les classes selon le programme sélectionné
  const filteredClasses = programId
    ? classes.filter((c) => c.program_id === parseInt(programId))
    : classes;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!studentId || !classId) {
      setError('Veuillez sélectionner un élève et une classe');
      return;
    }

    try {
      setSubmitting(true);

      const data: any = {
        student_id: parseInt(studentId),
        class_id: parseInt(classId),
      };

      if (expiresAt) {
        data.expires_at = expiresAt;
      }

      await enrollmentsApi.create(data);
      router.push('/admin/enrollments');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la création de l\'inscription');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-secondary">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Link href="/admin/enrollments">
          <Button variant="outline">← Retour</Button>
        </Link>
        <div>
          <h1 className="text-3xl font-playfair font-semibold text-secondary">
            Nouvelle Inscription
          </h1>
          <p className="text-gray-600 mt-1">Inscrire un élève à une classe</p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-card rounded-xl shadow-md p-8 space-y-6">
        {/* Sélection de l'élève */}
        <div>
          <label htmlFor="student" className="block text-sm font-medium text-secondary mb-2">
            Élève <span className="text-red-500">*</span>
          </label>
          <select
            id="student"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            required
          >
            <option value="">Sélectionner un élève</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.first_name} {student.last_name} ({student.email})
              </option>
            ))}
          </select>
          <p className="mt-1 text-sm text-gray-500">
            {students.length} élève{students.length > 1 ? 's' : ''} disponible{students.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Sélection du programme (optionnel, pour filtrer les classes) */}
        <div>
          <label htmlFor="program" className="block text-sm font-medium text-secondary mb-2">
            Programme (filtre optionnel)
          </label>
          <select
            id="program"
            value={programId}
            onChange={(e) => {
              setProgramId(e.target.value);
              setClassId(''); // Reset class selection
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">Tous les programmes</option>
            {programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-sm text-gray-500">
            Sélectionnez un programme pour filtrer les classes disponibles
          </p>
        </div>

        {/* Sélection de la classe */}
        <div>
          <label htmlFor="class" className="block text-sm font-medium text-secondary mb-2">
            Classe <span className="text-red-500">*</span>
          </label>
          <select
            id="class"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            required
          >
            <option value="">Sélectionner une classe</option>
            {filteredClasses.map((classItem) => {
              const program = programs.find((p) => p.id === classItem.program_id);
              return (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.name} - {program?.name} ({classItem.academic_year})
                </option>
              );
            })}
          </select>
          <p className="mt-1 text-sm text-gray-500">
            {filteredClasses.length} classe{filteredClasses.length > 1 ? 's' : ''} disponible
            {filteredClasses.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Date d'expiration (optionnelle) */}
        <div>
          <label htmlFor="expiresAt" className="block text-sm font-medium text-secondary mb-2">
            Date d'expiration (optionnelle)
          </label>
          <input
            type="date"
            id="expiresAt"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <p className="mt-1 text-sm text-gray-500">
            Si laissée vide, l'inscription n'aura pas de date d'expiration
          </p>
        </div>

        {/* Informations supplémentaires */}
        {classId && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-secondary mb-2">Informations sur la classe</h3>
            {(() => {
              const selectedClass = classes.find((c) => c.id === parseInt(classId));
              const selectedProgram = programs.find((p) => p.id === selectedClass?.program_id);

              if (!selectedClass) return null;

              return (
                <div className="text-sm text-gray-700 space-y-1">
                  <p>
                    <strong>Programme :</strong> {selectedProgram?.name || 'N/A'}
                  </p>
                  <p>
                    <strong>Année académique :</strong> {selectedClass.academic_year}
                  </p>
                  <p>
                    <strong>Statut :</strong>{' '}
                    {selectedClass.status === 'ongoing'
                      ? 'En cours'
                      : selectedClass.status === 'planned'
                      ? 'Planifiée'
                      : selectedClass.status === 'completed'
                      ? 'Terminée'
                      : 'Annulée'}
                  </p>
                  <p>
                    <strong>Période :</strong>{' '}
                    {new Date(selectedClass.start_date).toLocaleDateString('fr-FR')} -{' '}
                    {new Date(selectedClass.end_date).toLocaleDateString('fr-FR')}
                  </p>
                  {selectedClass.max_students && (
                    <p>
                      <strong>Places disponibles :</strong>{' '}
                      {selectedClass.enrolled_students_count || 0} / {selectedClass.max_students}
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-4 pt-4">
          <Link href="/admin/enrollments" className="flex-1">
            <Button type="button" variant="outline" className="w-full">
              Annuler
            </Button>
          </Link>
          <Button type="submit" variant="primary" disabled={submitting} className="flex-1">
            {submitting ? 'Inscription en cours...' : 'Créer l\'inscription'}
          </Button>
        </div>
      </form>
    </div>
  );
}
