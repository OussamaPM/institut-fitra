'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { enrollmentsApi } from '@/lib/api/enrollments';
import { programsApi } from '@/lib/api/programs';
import { classesApi } from '@/lib/api/classes';
import { Enrollment, Program, ClassModel } from '@/lib/types';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

export default function EnrollmentsPage() {
  useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [classes, setClasses] = useState<ClassModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filtres
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [programFilter, setProgramFilter] = useState<string>('');
  const [classFilter, setClassFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal de suppression
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [enrollmentToDelete, setEnrollmentToDelete] = useState<Enrollment | null>(null);

  useEffect(() => {
    fetchData();
  }, [statusFilter, programFilter, classFilter, searchQuery]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (programFilter) params.program_id = parseInt(programFilter);
      if (classFilter) params.class_id = parseInt(classFilter);
      if (searchQuery) params.search = searchQuery;

      const [enrollmentsData, programsResponse, classesResponse] = await Promise.all([
        enrollmentsApi.getAll(params),
        programsApi.getAll(),
        classesApi.getAll(),
      ]);

      setEnrollments(enrollmentsData);
      setPrograms(Array.isArray(programsResponse) ? programsResponse : programsResponse.data || []);
      setClasses(Array.isArray(classesResponse) ? classesResponse : classesResponse.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des inscriptions');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!enrollmentToDelete) return;

    try {
      const result = await enrollmentsApi.delete(enrollmentToDelete.id);
      setSuccessMessage(result.message);
      setDeleteModalOpen(false);
      setEnrollmentToDelete(null);
      fetchData();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'error' | 'warning'> = {
      active: 'success',
      completed: 'warning',
      cancelled: 'error',
    };
    const labels: Record<string, string> = {
      active: 'Active',
      completed: 'Terminée',
      cancelled: 'Annulée',
    };
    return <Badge variant={variants[status] || 'success'}>{labels[status] || status}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Filtrer les classes selon le programme sélectionné
  const filteredClasses = programFilter
    ? classes.filter((c) => c.program_id === parseInt(programFilter))
    : classes;

  if (loading && enrollments.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-secondary">Chargement des inscriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-playfair font-semibold text-secondary">
            Gestion des Inscriptions
          </h1>
          <p className="text-gray-600 mt-1">
            {enrollments.length} inscription{enrollments.length > 1 ? 's' : ''} au total
          </p>
        </div>
        <Link href="/admin/enrollments/create">
          <Button variant="primary">+ Nouvelle inscription</Button>
        </Link>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {successMessage}
        </div>
      )}

      {/* Filtres et recherche */}
      <div className="bg-card rounded-xl shadow-md p-4 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Recherche */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">Rechercher</label>
            <input
              type="text"
              placeholder="Nom, prénom, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Filtre par statut */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">Statut</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Active</option>
              <option value="completed">Terminée</option>
              <option value="cancelled">Annulée</option>
            </select>
          </div>

          {/* Filtre par programme */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">Programme</label>
            <select
              value={programFilter}
              onChange={(e) => {
                setProgramFilter(e.target.value);
                setClassFilter(''); // Reset class filter
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
          </div>

          {/* Filtre par classe */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">Classe</label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={!programFilter && filteredClasses.length > 20}
            >
              <option value="">Toutes les classes</option>
              {filteredClasses.map((classItem) => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bouton réinitialiser */}
        {(statusFilter !== 'all' || programFilter || classFilter || searchQuery) && (
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setStatusFilter('all');
                setProgramFilter('');
                setClassFilter('');
                setSearchQuery('');
              }}
            >
              ✕ Réinitialiser les filtres
            </Button>
          </div>
        )}
      </div>

      {/* Table des inscriptions */}
      <div className="bg-card rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 table-auto">
            <thead className="bg-gradient-to-r from-primary to-primary/80">
              <tr>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Élève
                </th>
                <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Programme
                </th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Classe
                </th>
                <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Date d'inscription
                </th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {enrollments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Aucune inscription trouvée
                  </td>
                </tr>
              ) : (
                enrollments.map((enrollment) => (
                  <tr key={enrollment.id} className="hover:bg-gray-50 transition">
                    <td className="px-3 md:px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 md:h-10 md:w-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-primary font-semibold text-xs md:text-sm">
                            {enrollment.student?.first_name?.[0]}
                            {enrollment.student?.last_name?.[0]}
                          </span>
                        </div>
                        <div className="ml-2 md:ml-4 min-w-0">
                          <div className="text-xs md:text-sm font-medium text-secondary truncate">
                            {enrollment.student?.first_name} {enrollment.student?.last_name}
                          </div>
                          <div className="text-xs text-gray-500 truncate hidden sm:block">
                            {enrollment.student?.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-6 py-4">
                      <div className="text-sm text-secondary truncate">
                        {enrollment.class?.program?.name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4">
                      <div className="text-xs md:text-sm text-secondary truncate">
                        {enrollment.class?.name || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500 hidden sm:block">
                        {enrollment.class?.academic_year || ''}
                      </div>
                    </td>
                    <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-secondary">
                        {formatDate(enrollment.enrolled_at)}
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(enrollment.status)}
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Link href={`/admin/enrollments/${enrollment.id}`}>
                          <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs">
                            Voir
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEnrollmentToDelete(enrollment);
                            setDeleteModalOpen(true);
                          }}
                          className="text-red-600 hover:bg-red-50 w-full sm:w-auto text-xs"
                        >
                          Suppr.
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de suppression */}
      {deleteModalOpen && enrollmentToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-secondary mb-4">Confirmer la suppression</h3>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer l'inscription de{' '}
              <strong>
                {enrollmentToDelete.student?.first_name} {enrollmentToDelete.student?.last_name}
              </strong>{' '}
              à la classe <strong>{enrollmentToDelete.class?.name}</strong> ?
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
                Annuler
              </Button>
              <Button
                variant="primary"
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
