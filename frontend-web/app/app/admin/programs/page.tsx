'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Badge } from '@/components/ui';
import { programsApi } from '@/lib/api/programs';
import { Program } from '@/lib/types';

export default function AdminProgramsPage() {
  const router = useRouter();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    active: '',
    search: '',
  });

  useEffect(() => {
    loadPrograms();
  }, [currentPage, filters]);

  const loadPrograms = async () => {
    try {
      setIsLoading(true);
      setError('');

      const response = await programsApi.getAll({
        page: currentPage,
        per_page: 15,
        active: filters.active === 'true' ? true : filters.active === 'false' ? false : undefined,
        search: filters.search || undefined,
      });

      setPrograms(response.data);
      setTotalPages(response.last_page);
    } catch (err: any) {
      console.error('Failed to load programs:', err);
      setError('Impossible de charger les programmes.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (programId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce programme ?')) {
      return;
    }

    try {
      await programsApi.delete(programId);
      loadPrograms();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Impossible de supprimer le programme.');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const getScheduleSummary = (program: Program) => {
    if (!program.schedule || program.schedule.length === 0) {
      return 'Aucun horaire';
    }
    return program.schedule
      .map(s => `${s.day} ${s.start_time}-${s.end_time}`)
      .join(', ');
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-playfair text-4xl font-semibold text-secondary mb-2">
            Gestion des programmes
          </h1>
          <p className="text-gray-600">
            Créez, modifiez et gérez tous les programmes de formation
          </p>
        </div>
        <Button onClick={() => router.push('/admin/programs/create')}>
          + Créer un programme
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
                placeholder="Nom du programme ou matière..."
                value={filters.search}
                onChange={(e) => {
                  setFilters({ ...filters, search: e.target.value });
                  setCurrentPage(1);
                }}
                className="input w-full"
              />
            </div>

            {/* Active Filter */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Statut
              </label>
              <select
                value={filters.active}
                onChange={(e) => {
                  setFilters({ ...filters, active: e.target.value });
                  setCurrentPage(1);
                }}
                className="input w-full"
              >
                <option value="">Tous les statuts</option>
                <option value="1">Actifs</option>
                <option value="0">Inactifs</option>
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

      {/* Programs Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : !programs || programs.length === 0 ? (
        <Card>
          <div className="p-12 text-center text-gray-500">
            Aucun programme trouvé
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
            {programs.map((program) => (
              <Card key={program.id} className="hover:shadow-lg transition-shadow">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-playfair text-xl font-semibold text-secondary mb-1">
                        {program.name}
                      </h3>
                      <p className="text-sm text-gray-600">{program.subject}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={program.active ? 'success' : 'neutral'}>
                        {program.active ? 'Actif' : 'Inactif'}
                      </Badge>
                      {(program.levels_count !== undefined && program.levels_count > 1) && (
                        <Badge variant="info" className="text-xs">
                          {program.levels_count} niveaux
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-gray-700 text-sm mb-4 line-clamp-2">
                    {program.description}
                  </p>

                  {/* Teacher */}
                  {program.teacher && (
                    <div className="flex items-center gap-2 mb-3 text-sm">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="text-gray-600">
                        {program.teacher.teacher_profile?.first_name} {program.teacher.teacher_profile?.last_name}
                      </span>
                    </div>
                  )}

                  {/* Schedule */}
                  <div className="flex items-start gap-2 mb-3 text-sm">
                    <svg className="w-4 h-4 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-gray-600 text-xs leading-relaxed">
                      {getScheduleSummary(program)}
                    </span>
                  </div>

                  {/* Price */}
                  <div className="mb-4 pb-4 border-b">
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-bold text-primary">
                        {formatPrice(program.price)}
                      </span>
                      {program.max_installments > 1 && (
                        <span className="text-xs text-gray-500">
                          Paiement en {program.max_installments}× possible
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action */}
                  <Link href={`/admin/programs/${program.id}`}>
                    <Button variant="outline" size="sm" className="w-full">
                      Accéder au programme
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Card>
              <div className="px-6 py-4 flex items-center justify-between">
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
            </Card>
          )}
        </>
      )}
    </div>
  );
}
