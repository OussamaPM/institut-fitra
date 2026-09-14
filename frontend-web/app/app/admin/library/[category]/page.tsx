'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Badge, Button, Card, Input, Modal } from '@/components/ui';
import { libraryApi } from '@/lib/api';
import {
  LibraryAccessLevelOption,
  LibraryAccessOption,
  LibraryCategory,
  LibraryFolder,
  SaveLibraryFolderData,
} from '@/lib/types';

const CATEGORY_LABELS: Record<LibraryCategory, string> = {
  media: 'Vidéos & Audios',
  resource: 'Ressources',
};

/** Une ligne du sélecteur d'accès : une classe cochée, et le niveau ciblé. */
interface AccessRow {
  class_id: number;
  level_number: number;
}

export default function AdminLibraryCategoryPage() {
  const params = useParams();
  const router = useRouter();
  const category = params.category as LibraryCategory;

  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [options, setOptions] = useState<LibraryAccessOption[]>([]);
  const [optionsFailed, setOptionsFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<LibraryFolder | null>(null);
  const [title, setTitle] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [accesses, setAccesses] = useState<AccessRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [formError, setFormError] = useState('');

  const isValidCategory = category === 'media' || category === 'resource';

  const loadFolders = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      setFolders(await libraryApi.getFolders(category, debouncedSearch));
    } catch (err) {
      console.error('Failed to load library folders:', err);
      setError('Impossible de charger les dossiers.');
    } finally {
      setIsLoading(false);
    }
  }, [category, debouncedSearch]);

  // Sans délai, chaque frappe déclencherait une requête et démonterait la grille
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!isValidCategory) {
      router.replace('/admin/library');
      return;
    }
    loadFolders();
  }, [isValidCategory, loadFolders, router]);

  useEffect(() => {
    libraryApi
      .getAccessOptions()
      .then((data) => {
        setOptions(data);
        setOptionsFailed(false);
      })
      .catch((err) => {
        // Sans ce signal, la modale afficherait « aucune classe disponible » et
        // l'admin cocherait « Tout » — publiant à tous un dossier réservé.
        console.error('Failed to load access options:', err);
        setOptionsFailed(true);
        setError('Impossible de charger la liste des classes.');
      });
  }, []);

  const openCreate = () => {
    setEditing(null);
    setTitle('');
    setIsPublic(false);
    setAccesses([]);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEdit = (folder: LibraryFolder) => {
    setEditing(folder);
    setTitle(folder.title);
    setIsPublic(folder.is_public);
    setAccesses(
      (folder.accesses ?? []).map((access) => ({
        class_id: access.class_id,
        level_number: access.level_number,
      })),
    );
    setFormError('');
    setIsModalOpen(true);
  };

  /**
   * Lignes affichées dans le sélecteur : les classes proposées par l'API, plus
   * celles déjà ciblées par le dossier qui n'y figurent plus (classe annulée).
   * Sans cela, un dossier ciblant une classe annulée serait impossible à modifier :
   * l'API refuserait un accès qu'aucune case à l'écran ne permet de retirer.
   */
  const accessRows = (): (LibraryAccessOption & { unavailable?: boolean })[] => {
    const known = new Set(options.map((option) => option.class_id));

    const orphans = accesses
      .filter((row) => !known.has(row.class_id))
      .map((row) => {
        const stored = editing?.accesses?.find((access) => access.class_id === row.class_id);

        return {
          class_id: row.class_id,
          class_name: stored?.class?.name ?? `Classe #${row.class_id}`,
          academic_year: stored?.class?.academic_year ?? '',
          program_id: null,
          program_name: null,
          levels: [{ level_number: row.level_number, label: `Niveau ${row.level_number}` }],
          unavailable: true,
        };
      });

    return [...options, ...orphans];
  };

  /**
   * Niveaux proposés pour une classe, en conservant le niveau déjà enregistré même
   * s'il a été désactivé depuis : sinon le <select> afficherait « Niveau 1 » alors
   * que l'état vaut 2, et l'enregistrement échouerait sans explication visible.
   */
  const levelsFor = (option: LibraryAccessOption, selected: number): LibraryAccessLevelOption[] => {
    if (option.levels.some((level) => level.level_number === selected)) {
      return option.levels;
    }

    return [...option.levels, { level_number: selected, label: `Niveau ${selected} — désactivé` }]
      .sort((a, b) => a.level_number - b.level_number);
  };

  const toggleClass = (classId: number) => {
    setAccesses((current) =>
      current.some((row) => row.class_id === classId)
        ? current.filter((row) => row.class_id !== classId)
        : [...current, { class_id: classId, level_number: 1 }],
    );
  };

  const setLevel = (classId: number, levelNumber: number) => {
    setAccesses((current) =>
      current.map((row) => (row.class_id === classId ? { ...row, level_number: levelNumber } : row)),
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setFormError('Le titre est obligatoire.');
      return;
    }
    if (!isPublic && accesses.length === 0) {
      setFormError('Sélectionnez au moins une classe, ou cochez « Tout ».');
      return;
    }

    try {
      setIsSaving(true);
      setFormError('');

      // Quand le dossier est public, les classes ne sont pas envoyées : l'API les ignore
      const payload: SaveLibraryFolderData = {
        title: title.trim(),
        is_public: isPublic,
        ...(isPublic ? {} : { accesses }),
      };

      if (editing) {
        await libraryApi.updateFolder(editing.id, payload);
      } else {
        await libraryApi.createFolder({ ...payload, category });
      }

      setIsModalOpen(false);
      await loadFolders();
    } catch (err: any) {
      console.error('Failed to save folder:', err);
      setFormError(
        err?.response?.data?.message
          || Object.values(err?.response?.data?.errors ?? {}).flat()[0] as string
          || 'Impossible d\'enregistrer le dossier.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (folder: LibraryFolder) => {
    // Dépublier retire le dossier à tous les élèves dans l'instant
    if (folder.is_published && !confirm(`Retirer « ${folder.title} » aux élèves ?`)) {
      return;
    }

    try {
      setBusyId(folder.id);
      setError('');
      await libraryApi.setFolderStatus(folder.id, folder.is_published ? 'draft' : 'published');
      await loadFolders();
    } catch (err: any) {
      console.error('Failed to change status:', err);
      setError(err?.response?.data?.message || 'Impossible de changer le statut du dossier.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (folder: LibraryFolder) => {
    const count = folder.items_count ?? 0;
    const warning = count > 0
      ? `\n\nCe dossier contient ${count} contenu${count > 1 ? 's' : ''} qui ${count > 1 ? 'seront supprimés' : 'sera supprimé'} également.`
      : '';

    if (!confirm(`Supprimer définitivement le dossier « ${folder.title} » ?${warning}`)) {
      return;
    }

    try {
      setBusyId(folder.id);
      setError('');
      await libraryApi.deleteFolder(folder.id);
      await loadFolders();
    } catch (err) {
      console.error('Failed to delete folder:', err);
      setError('Impossible de supprimer le dossier.');
    } finally {
      setBusyId(null);
    }
  };

  /** Résumé lisible des destinataires, affiché sur chaque carte. */
  const describeAccess = (folder: LibraryFolder): string => {
    if (folder.is_public) return 'Tous les utilisateurs';
    if (!folder.accesses?.length) return 'Aucun destinataire';

    return folder.accesses
      .map((access) => {
        const name = access.class?.name ?? `Classe #${access.class_id}`;
        return access.level_number > 1 ? `${name} — niveau ${access.level_number}` : name;
      })
      .join(' · ');
  };

  if (!isValidCategory) return null;

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/library" className="text-sm text-gray-500 hover:text-primary">
            ← Bibliothèque
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-secondary">{CATEGORY_LABELS[category]}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {folders.length} dossier{folders.length > 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={openCreate}>+ Nouveau dossier</Button>
      </div>

      <Input
        label="Rechercher"
        placeholder="Rechercher un dossier..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <p className="py-12 text-center text-sm text-gray-500">Chargement...</p>
      ) : folders.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-gray-500">
            Aucun dossier pour le moment. Créez-en un pour commencer à organiser vos contenus.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {folders.map((folder) => (
            <Card key={folder.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/admin/library/${category}/${folder.id}`}
                  className="min-w-0 flex-1 text-base font-medium text-secondary hover:text-primary"
                >
                  {folder.title}
                </Link>
                <Badge variant={folder.is_published ? 'success' : 'neutral'} size="sm">
                  {folder.is_published ? 'Publié' : 'Brouillon'}
                </Badge>
              </div>

              <p className="mt-2 text-xs text-gray-500">
                {folder.items_count ?? 0} contenu{(folder.items_count ?? 0) > 1 ? 's' : ''}
              </p>
              <p className="mt-3 line-clamp-2 text-xs text-gray-600" title={describeAccess(folder)}>
                <span className="text-gray-400">Accès : </span>
                {describeAccess(folder)}
              </p>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                <Link href={`/admin/library/${category}/${folder.id}`}>
                  <Button variant="outline" size="sm">Ouvrir</Button>
                </Link>
                <Button variant="outline" size="sm" onClick={() => openEdit(folder)}>
                  Modifier
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleStatus(folder)}
                  disabled={busyId === folder.id}
                >
                  {folder.is_published ? 'Dépublier' : 'Publier'}
                </Button>
                <button
                  type="button"
                  onClick={() => handleDelete(folder)}
                  disabled={busyId === folder.id}
                  className="rounded-lg px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                  Supprimer
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? 'Modifier le dossier' : 'Nouveau dossier'}
        size="lg"
      >
        <div className="space-y-5">
          <Input
            label="Titre du dossier"
            placeholder="Ex : Sciences du Coran — Année 1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div>
            <p className="mb-2 text-sm font-medium text-secondary">Qui peut consulter ce dossier ?</p>

            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-secondary">Tout — tous les utilisateurs de la plateforme</span>
            </label>

            {!isPublic && (
              <div className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
                {accessRows().length === 0 ? (
                  <p className="py-4 text-center text-xs text-gray-500">
                    {optionsFailed
                      ? 'Liste des classes indisponible — rechargez la page.'
                      : 'Aucune classe disponible.'}
                  </p>
                ) : (
                  accessRows().map((option) => {
                    const row = accesses.find((access) => access.class_id === option.class_id);

                    return (
                      <div key={option.class_id} className="rounded-lg px-2 py-1.5 hover:bg-gray-50">
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={Boolean(row)}
                            onChange={() => toggleClass(option.class_id)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="min-w-0 flex-1 truncate text-sm text-secondary">
                            {option.class_name}
                            {option.program_name && (
                              <span className="text-gray-400"> · {option.program_name}</span>
                            )}
                            {option.unavailable && (
                              <span className="ml-2 text-xs text-amber-600">classe indisponible</span>
                            )}
                          </span>
                        </label>

                        {row && (
                          <select
                            value={row.level_number}
                            onChange={(e) => setLevel(option.class_id, Number(e.target.value))}
                            className="mt-1.5 ml-6 w-[calc(100%-1.5rem)] rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-secondary focus:border-primary focus:outline-none"
                          >
                            {levelsFor(option, row.level_number).map((level) => (
                              <option key={level.level_number} value={level.level_number}>
                                {level.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}

          <p className="text-xs text-gray-500">
            {editing
              ? 'Le statut de publication se modifie depuis la liste des dossiers.'
              : 'Le dossier est créé en brouillon : il ne sera visible des élèves qu\'une fois publié.'}
          </p>

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Enregistrement...' : editing ? 'Enregistrer' : 'Créer le dossier'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
