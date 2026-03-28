'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Badge, UserAvatar } from '@/components/ui';
import { usersApi } from '@/lib/api/users';
import { User } from '@/lib/types';

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    role: '',
    search: '',
  });

  useEffect(() => {
    loadUsers();
  }, [currentPage, filters]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setError('');

      const response = await usersApi.getAll({
        page: currentPage,
        per_page: 15,
        role: filters.role || undefined,
        search: filters.search || undefined,
      });

      setUsers(response.data);
      setTotalPages(response.last_page);
    } catch (err: any) {
      console.error('Failed to load users:', err);
      setError('Impossible de charger les utilisateurs.');
    } finally {
      setIsLoading(false);
    }
  };

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleDelete = async (userId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      return;
    }

    try {
      await usersApi.delete(userId);
      loadUsers(); // Recharger la liste
    } catch (err: any) {
      alert(err.response?.data?.message || 'Impossible de supprimer l\'utilisateur.');
    }
  };

  const handleOpenPasswordModal = (userId: number) => {
    setSelectedUserId(userId);
    setNewPassword('');
    setPasswordModalOpen(true);
  };

  const handleUpdatePassword = async () => {
    if (!selectedUserId || !newPassword) {
      alert('Veuillez saisir un mot de passe');
      return;
    }

    try {
      setIsUpdatingPassword(true);
      await usersApi.update(selectedUserId, { password: newPassword });
      alert('Mot de passe mis à jour avec succès');
      setPasswordModalOpen(false);
      setNewPassword('');
      setSelectedUserId(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Impossible de mettre à jour le mot de passe');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="error">Administrateur</Badge>;
      case 'teacher':
        return <Badge variant="primary">Professeur</Badge>;
      case 'student':
        return <Badge variant="info">Élève</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-playfair text-4xl font-semibold text-secondary mb-2">
            Gestion des utilisateurs
          </h1>
          <p className="text-gray-600">
            Créez, modifiez et gérez tous les utilisateurs de la plateforme
          </p>
        </div>
        <Button onClick={() => router.push('/admin/users/create')}>
          + Créer un utilisateur
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Rechercher
              </label>
              <input
                type="text"
                placeholder="Nom, prénom ou email..."
                value={filters.search}
                onChange={(e) => {
                  setFilters({ ...filters, search: e.target.value });
                  setCurrentPage(1);
                }}
                className="input w-full"
              />
            </div>

            {/* Role Filter */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Filtrer par rôle
              </label>
              <select
                value={filters.role}
                onChange={(e) => {
                  setFilters({ ...filters, role: e.target.value });
                  setCurrentPage(1);
                }}
                className="input w-full"
              >
                <option value="">Tous les rôles</option>
                <option value="student">Élèves</option>
                <option value="teacher">Professeurs</option>
                <option value="admin">Administrateurs</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error rounded-lg">
          <p className="text-error text-sm">{error}</p>
        </div>
      )}

      {/* Users Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rôle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date d'inscription
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const profile = user.student_profile || user.teacher_profile;
                  const firstName = profile?.first_name || 'N/A';
                  const lastName = profile?.last_name || 'N/A';
                  const gender = user.student_profile?.gender || user.teacher_profile?.gender;
                  const profilePhoto = user.student_profile?.profile_photo_url ?? user.student_profile?.profile_photo ?? user.teacher_profile?.profile_photo_url ?? user.teacher_profile?.profile_photo;

                  return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <UserAvatar
                          firstName={firstName}
                          lastName={lastName}
                          gender={gender}
                          profilePhoto={profilePhoto}
                          size="md"
                          role={user.role}
                          showGenderBadge={user.role === 'student'}
                          className="mr-3"
                        />
                        <div>
                          <div className="text-sm font-medium text-secondary">
                            {firstName} {lastName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(user.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/admin/users/${user.id}`)}
                        >
                          Fiche
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenPasswordModal(user.id)}
                        >
                          Mot de passe
                        </Button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Page {currentPage} sur {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal Mot de passe */}
      {passwordModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="font-playfair text-2xl font-semibold text-secondary mb-4">
              Modifier le mot de passe
            </h3>

            <div className="mb-6">
              <label className="block text-sm font-medium text-secondary mb-2">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Saisir le nouveau mot de passe"
                className="input w-full"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                Le mot de passe doit contenir au moins 8 caractères
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setPasswordModalOpen(false);
                  setNewPassword('');
                  setSelectedUserId(null);
                }}
                disabled={isUpdatingPassword}
              >
                Annuler
              </Button>
              <Button
                onClick={handleUpdatePassword}
                disabled={isUpdatingPassword || newPassword.length < 8}
                isLoading={isUpdatingPassword}
              >
                {isUpdatingPassword ? 'Mise à jour...' : 'Mettre à jour'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
