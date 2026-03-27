'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Badge } from '@/components/ui';
import { classesApi } from '@/lib/api/classes';
import { ClassModel } from '@/lib/types';

export default function AdminClassesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    academic_year: '',
    search: '',
  });

  useEffect(() => {
    loadClasses();
  }, [filters]);

  const loadClasses = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await classesApi.getAll({
        per_page: 200,
        status: filters.status || undefined,
        academic_year: filters.academic_year || undefined,
      });
      setClasses(response.data);
    } catch (err: any) {
      setError('Impossible de charger les classes.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (classId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette classe ?')) return;
    try {
      await classesApi.delete(classId);
      loadClasses();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Impossible de supprimer la classe.');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'info' | 'warning' | 'neutral' | 'error'> = {
      planned: 'info',
      ongoing: 'success',
      completed: 'neutral',
      cancelled: 'error',
    };
    const labels: Record<string, string> = {
      planned: 'Planifiée',
      ongoing: 'En cours',
      completed: 'Terminée',
      cancelled: 'Annulée',
    };
    return <Badge variant={variants[status] || 'neutral'}>{labels[status] || status}</Badge>;
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

  // Filtrage par recherche (côté client)
  const filtered = useMemo(() => {
    if (!filters.search) return classes;
    const q = filters.search.toLowerCase();
    return classes.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.program?.name?.toLowerCase().includes(q) ||
        c.academic_year.includes(q)
    );
  }, [classes, filters.search]);

  // Groupement par programme, avec arborescence parent→enfants
  const grouped = useMemo(() => {
    const byProgram: Record<number, { programName: string; roots: ClassModel[] }> = {};

    const classMap = new Map(filtered.map((c) => [c.id, c]));

    for (const cls of filtered) {
      const progId = cls.program_id;
      const progName = cls.program?.name ?? `Programme #${progId}`;
      if (!byProgram[progId]) byProgram[progId] = { programName: progName, roots: [] };

      // Racine = classe sans parent OU dont le parent n'est pas dans la liste filtrée
      if (!cls.parent_class_id || !classMap.has(cls.parent_class_id)) {
        byProgram[progId].roots.push(cls);
      }
    }

    return Object.values(byProgram).sort((a, b) =>
      a.programName.localeCompare(b.programName)
    );
  }, [filtered]);

  // Rendu récursif d'une classe et ses enfants
  const renderClass = (cls: ClassModel, depth = 0) => {
    const children = filtered.filter((c) => c.parent_class_id === cls.id);

    return (
      <div key={cls.id}>
        <div
          className={`flex items-center gap-3 p-3 rounded-lg border transition-shadow hover:shadow-sm ${
            depth === 0 ? 'border-gray-200 bg-white' : 'border-blue-100 bg-blue-50/50'
          }`}
          style={{ marginLeft: depth * 24 }}
        >
          {/* Indicateur de profondeur */}
          {depth > 0 && (
            <div className="flex items-center gap-1 shrink-0">
              <div className="w-4 h-px bg-blue-300" />
              <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          )}

          {/* Infos classe */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm text-secondary truncate">{cls.name}</span>
              <span className="text-xs text-gray-400">{cls.academic_year}</span>
              {getStatusBadge(cls.status)}
              {cls.parent_class_id && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  Suite
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
              <span>{formatDate(cls.start_date)} → {formatDate(cls.end_date)}</span>
              <span className="font-medium text-primary">
                {cls.enrolled_students_count ?? 0} élève{(cls.enrolled_students_count ?? 0) > 1 ? 's' : ''}
                {cls.max_students && ` / ${cls.max_students}`}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <Link href={`/admin/classes/${cls.id}/students`}>
              <button className="p-1.5 text-gray-500 hover:text-secondary hover:bg-gray-100 rounded transition-colors" title="Voir les élèves">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </button>
            </Link>
            <Link href={`/admin/classes/${cls.id}`}>
              <button className="p-1.5 text-gray-500 hover:text-secondary hover:bg-gray-100 rounded transition-colors" title="Voir">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </Link>
            <Link href={`/admin/classes/${cls.id}/edit`}>
              <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Modifier">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </Link>
            <button
              onClick={() => handleDelete(cls.id)}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Supprimer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Enfants récursifs */}
        {children.length > 0 && (
          <div className="mt-1.5 space-y-1.5">
            {children.map((child) => renderClass(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-playfair text-4xl font-semibold text-secondary mb-2">
            Gestion des classes
          </h1>
          <p className="text-gray-600">Créez et gérez les promotions de chaque programme</p>
        </div>
        <Button onClick={() => router.push('/admin/classes/create')}>
          + Créer une classe
        </Button>
      </div>

      {/* Filtres */}
      <Card className="mb-6">
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Année académique</label>
              <input
                type="text"
                placeholder="Ex: 2025/2026"
                value={filters.academic_year}
                onChange={(e) => setFilters({ ...filters, academic_year: e.target.value })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Statut</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="input w-full"
              >
                <option value="">Tous les statuts</option>
                <option value="planned">Planifiée</option>
                <option value="ongoing">En cours</option>
                <option value="completed">Terminée</option>
                <option value="cancelled">Annulée</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Rechercher</label>
              <input
                type="text"
                placeholder="Nom, programme..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="input w-full"
              />
            </div>
          </div>
        </div>
      </Card>

      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error rounded-lg">
          <p className="text-error text-sm">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      ) : grouped.length === 0 ? (
        <Card>
          <div className="p-12 text-center text-gray-500">Aucune classe trouvée</div>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <Card key={group.programName}>
              {/* En-tête du programme */}
              <div className="px-4 py-3 border-b bg-gray-50 rounded-t-xl flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span className="font-semibold text-secondary text-sm">{group.programName}</span>
                <span className="ml-auto text-xs text-gray-400">
                  {filtered.filter((c) => c.program_id === filtered.find((x) => x.program?.name === group.programName)?.program_id).length} classe(s)
                </span>
              </div>

              {/* Classes du programme */}
              <div className="p-4 space-y-2">
                {group.roots.map((cls) => renderClass(cls))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
