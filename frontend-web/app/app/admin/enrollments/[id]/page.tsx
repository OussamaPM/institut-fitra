'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { enrollmentsApi } from '@/lib/api/enrollments';
import { Enrollment } from '@/lib/types';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

export default function EnrollmentDetailsPage() {
  useRouter();
  const params = useParams();
  const enrollmentId = parseInt(params.id as string);

  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal de modification de statut
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [newExpiresAt, setNewExpiresAt] = useState<string>('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchEnrollment();
  }, [enrollmentId]);

  const fetchEnrollment = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await enrollmentsApi.getById(enrollmentId);
      setEnrollment(data);
      setNewStatus(data.status);
      setNewExpiresAt(data.expires_at || '');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!enrollment) return;

    try {
      setUpdating(true);
      setError(null);

      const data: any = { status: newStatus };
      if (newExpiresAt) {
        data.expires_at = newExpiresAt;
      }

      const result = await enrollmentsApi.update(enrollment.id, data);
      setSuccessMessage(result.message);
      setStatusModalOpen(false);
      fetchEnrollment();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la mise à jour');
    } finally {
      setUpdating(false);
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
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  if (error && !enrollment) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
        <Link href="/admin/enrollments">
          <Button variant="outline">← Retour à la liste</Button>
        </Link>
      </div>
    );
  }

  if (!enrollment) {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/enrollments">
            <Button variant="outline">← Retour</Button>
          </Link>
          <div>
            <h1 className="text-3xl font-playfair font-semibold text-secondary">
              Détails de l'inscription
            </h1>
            <p className="text-gray-600 mt-1">Inscription #{enrollment.id}</p>
          </div>
        </div>
        <Button variant="primary" onClick={() => setStatusModalOpen(true)}>
          Modifier le statut
        </Button>
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

      {/* Layout 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informations de l'élève */}
          <div className="bg-card rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-secondary mb-4 flex items-center gap-2">
              <span className="text-2xl">👤</span>
              Informations de l'élève
            </h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-primary font-semibold text-xl">
                    {enrollment.student?.first_name?.[0]}
                    {enrollment.student?.last_name?.[0]}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-secondary">
                    {enrollment.student?.first_name} {enrollment.student?.last_name}
                  </h3>
                  <p className="text-gray-600">{enrollment.student?.email}</p>
                </div>
              </div>

              {enrollment.student?.student_profile && (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-gray-500">Téléphone</p>
                    <p className="text-secondary">
                      {enrollment.student.student_profile.phone || 'Non renseigné'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date de naissance</p>
                    <p className="text-secondary">
                      {enrollment.student.student_profile.date_of_birth
                        ? formatDate(enrollment.student.student_profile.date_of_birth)
                        : 'Non renseignée'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Ville</p>
                    <p className="text-secondary">
                      {enrollment.student.student_profile.city || 'Non renseignée'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Pays</p>
                    <p className="text-secondary">
                      {enrollment.student.student_profile.country || 'Non renseigné'}
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-4">
                <Link href={`/admin/users/${enrollment.student?.id}`}>
                  <Button variant="outline" size="sm">
                    Voir la fiche complète
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Informations sur la classe et le programme */}
          <div className="bg-card rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-secondary mb-4 flex items-center gap-2">
              <span className="text-2xl">📚</span>
              Classe et Programme
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Programme</p>
                <p className="text-lg font-semibold text-secondary">
                  {enrollment.class?.program?.name || 'N/A'}
                </p>
                {enrollment.class?.program?.description && (
                  <p className="text-sm text-gray-600 mt-2">
                    {enrollment.class.program.description}
                  </p>
                )}
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-1">Classe</p>
                <p className="text-lg font-semibold text-secondary">{enrollment.class?.name || 'N/A'}</p>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <p className="text-xs text-gray-500">Année académique</p>
                    <p className="text-sm text-secondary">{enrollment.class?.academic_year || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Statut de la classe</p>
                    <p className="text-sm text-secondary">
                      {enrollment.class?.status === 'ongoing'
                        ? 'En cours'
                        : enrollment.class?.status === 'planned'
                        ? 'Planifiée'
                        : enrollment.class?.status === 'completed'
                        ? 'Terminée'
                        : 'Annulée'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Date de début</p>
                    <p className="text-sm text-secondary">
                      {enrollment.class?.start_date
                        ? formatDate(enrollment.class.start_date)
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Date de fin</p>
                    <p className="text-sm text-secondary">
                      {enrollment.class?.end_date ? formatDate(enrollment.class.end_date) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Link href={`/admin/classes/${enrollment.class?.id}`}>
                  <Button variant="outline" size="sm">
                    Voir les détails de la classe
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          {/* Statut de l'inscription */}
          <div className="bg-card rounded-xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-secondary mb-4">Statut de l'inscription</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Statut actuel</span>
                {getStatusBadge(enrollment.status)}
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-1">Date d'inscription</p>
                <p className="text-secondary">{formatDateTime(enrollment.enrolled_at)}</p>
              </div>

              {enrollment.expires_at && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Date d'expiration</p>
                  <p className="text-secondary">{formatDate(enrollment.expires_at)}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-500 mb-1">Dernière mise à jour</p>
                <p className="text-secondary text-sm">{enrollment.updated_at ? formatDateTime(enrollment.updated_at) : '-'}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-card rounded-xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-secondary mb-4">Actions rapides</h2>
            <div className="space-y-3">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => setStatusModalOpen(true)}
              >
                Modifier le statut
              </Button>
              <Link href={`/admin/classes/${enrollment.class?.id}/students`} className="block">
                <Button variant="outline" className="w-full">
                  Voir tous les élèves de la classe
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de modification de statut */}
      {statusModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-secondary mb-4">Modifier le statut</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Nouveau statut
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="active">Active</option>
                  <option value="completed">Terminée</option>
                  <option value="cancelled">Annulée</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Date d'expiration (optionnelle)
                </label>
                <input
                  type="date"
                  value={newExpiresAt}
                  onChange={(e) => setNewExpiresAt(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <Button variant="outline" onClick={() => setStatusModalOpen(false)}>
                Annuler
              </Button>
              <Button variant="primary" onClick={handleUpdateStatus} disabled={updating}>
                {updating ? 'Mise à jour...' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
