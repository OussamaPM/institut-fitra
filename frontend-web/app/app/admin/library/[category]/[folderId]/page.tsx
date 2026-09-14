'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge, Button, Card, Input, Modal } from '@/components/ui';
import { LIBRARY_ITEMS_PER_PAGE, libraryApi } from '@/lib/api/library';
import { LibraryCategory, LibraryFolder, LibraryItem } from '@/lib/types';

const CATEGORY_LABELS: Record<LibraryCategory, string> = {
  media: 'Vidéos & Audios',
  resource: 'Ressources',
};

/** 20 Mo, aligné sur LibraryItemRequest::MAX_FILE_KB. */
const MAX_FILE_BYTES = 20 * 1024 * 1024;

/** Taille lisible d'un document. */
const formatSize = (bytes: number | null): string => {
  if (!bytes) return '';
  const mo = bytes / (1024 * 1024);
  return mo >= 1 ? `${mo.toFixed(1)} Mo` : `${Math.round(bytes / 1024)} Ko`;
};

export default function AdminLibraryFolderPage() {
  const params = useParams();
  const category = params.category as LibraryCategory;
  const folderId = Number(params.folderId);

  const [folder, setFolder] = useState<LibraryFolder | null>(null);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(LIBRARY_ITEMS_PER_PAGE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [movingId, setMovingId] = useState<number | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<LibraryItem | null>(null);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'video' | 'audio'>('video');
  const [embedUrl, setEmbedUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [preview, setPreview] = useState<LibraryItem | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  // La catégorie affichée vient du dossier, pas de l'URL : un lien erroné ne doit
  // pas proposer d'envoyer un PDF dans un dossier vidéo.
  const isMedia = folder?.category === 'media';
  const perPage = pageSize || LIBRARY_ITEMS_PER_PAGE;

  const loadItems = useCallback(async (targetPage: number) => {
    try {
      setIsLoading(true);
      setError('');
      const data = await libraryApi.getItems(folderId, targetPage);
      setItems(data.items.data);
      setLastPage(data.items.last_page);
      setTotal(data.items.total);
      setPage(data.items.current_page);
      setPageSize(data.items.per_page || LIBRARY_ITEMS_PER_PAGE);
      setFolder(data.folder);
    } catch (err) {
      console.error('Failed to load library items:', err);
      setError('Impossible de charger les contenus.');
    } finally {
      setIsLoading(false);
    }
  }, [folderId]);

  useEffect(() => {
    if (Number.isFinite(folderId)) {
      loadItems(1);
      return;
    }

    setIsLoading(false);
    setError('Dossier introuvable.');
  }, [folderId, loadItems]);

  const openCreate = () => {
    setEditing(null);
    setTitle('');
    setType('video');
    setEmbedUrl('');
    setFile(null);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEdit = (item: LibraryItem) => {
    setEditing(item);
    setTitle(item.title);
    setType(item.type === 'audio' ? 'audio' : 'video');
    setEmbedUrl(item.embed_url ?? '');
    setFile(null);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setFormError('Le titre est obligatoire.');
      return;
    }
    if (!editing && isMedia && !embedUrl.trim()) {
      setFormError('Collez le lien ou le code iframe du contenu.');
      return;
    }
    if (!editing && !isMedia && !file) {
      setFormError('Sélectionnez un fichier PDF.');
      return;
    }
    // Contrôlé ici aussi : au-delà des limites PHP, la requête est tronquée avant
    // d'atteindre Laravel et l'erreur renvoyée serait incompréhensible.
    if (file && file.size > MAX_FILE_BYTES) {
      setFormError('Le fichier dépasse 20 Mo.');
      return;
    }
    if (file && file.type !== 'application/pdf') {
      setFormError('Seuls les fichiers PDF sont acceptés.');
      return;
    }

    try {
      setIsSaving(true);
      setFormError('');

      if (editing) {
        await libraryApi.updateItem(editing.id, {
          title: title.trim(),
          ...(isMedia ? { type, embed_url: embedUrl.trim() } : {}),
        });
      } else if (isMedia) {
        await libraryApi.createItem(folderId, { title: title.trim(), type, embed_url: embedUrl.trim() });
      } else {
        await libraryApi.createItem(folderId, { title: title.trim(), file: file! });
      }

      setIsModalOpen(false);
      // Un ajout se place en fin de liste : on saute sur la dernière page
      await loadItems(editing ? page : Math.ceil((total + 1) / perPage));
    } catch (err: any) {
      console.error('Failed to save item:', err);
      setFormError(
        err?.response?.data?.message
          || Object.values(err?.response?.data?.errors ?? {}).flat()[0] as string
          || 'Impossible d\'enregistrer ce contenu.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleMove = async (item: LibraryItem, direction: 'up' | 'down') => {
    try {
      setMovingId(item.id);
      setError('');
      const data = await libraryApi.moveItem(item.id, direction, page);

      // Un déplacement peut faire franchir une frontière de page : on suit l'item
      // plutôt que de laisser l'admin croire que son clic n'a rien fait.
      const targetPage = Math.ceil(data.item.position / perPage);

      if (data.moved && targetPage !== data.items.current_page) {
        await loadItems(targetPage);
        setHighlightId(item.id);
        return;
      }

      setItems(data.items.data);
      setPage(data.items.current_page);
      setLastPage(data.items.last_page);
      if (data.moved) setHighlightId(item.id);
    } catch (err) {
      console.error('Failed to move item:', err);
      setError('Impossible de déplacer ce contenu.');
    } finally {
      setMovingId(null);
    }
  };

  /** Ouvre un document : l'URL signée est demandée en XHR, la fenêtre ouverte avant. */
  const handleOpenDocument = async (item: LibraryItem) => {
    const tab = window.open('', '_blank');

    try {
      setBusyId(item.id);
      setError('');
      const url = await libraryApi.getDownloadUrl(item.id);

      if (tab) {
        tab.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch (err) {
      console.error('Failed to open document:', err);
      tab?.close();
      setError('Impossible d\'ouvrir ce document.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (item: LibraryItem) => {
    if (!confirm(`Supprimer définitivement « ${item.title} » ?`)) return;

    try {
      setBusyId(item.id);
      setError('');
      await libraryApi.deleteItem(item.id);
      // La page courante peut s'être vidée après suppression
      await loadItems(items.length === 1 && page > 1 ? page - 1 : page);
    } catch (err) {
      console.error('Failed to delete item:', err);
      setError('Impossible de supprimer ce contenu.');
    } finally {
      setBusyId(null);
    }
  };

  const isFirstOverall = (index: number) => page === 1 && index === 0;
  const isLastOverall = (index: number) => page === lastPage && index === items.length - 1;

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href={`/admin/library/${category}`} className="text-sm text-gray-500 hover:text-primary">
            ← {CATEGORY_LABELS[category] ?? 'Bibliothèque'}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-secondary">{folder?.title ?? 'Dossier'}</h1>
            {folder && (
              <Badge variant={folder.is_published ? 'success' : 'neutral'} size="sm">
                {folder.is_published ? 'Publié' : 'Brouillon'}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {total} contenu{total > 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={openCreate} disabled={!folder}>
          {isMedia ? '+ Ajouter une vidéo / un audio' : '+ Ajouter un document'}
        </Button>
      </div>

      {folder && !folder.is_published && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Ce dossier est en brouillon : les élèves ne le voient pas encore.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <p className="py-12 text-center text-sm text-gray-500">Chargement...</p>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-gray-500">
            {isMedia
              ? 'Aucun contenu. Collez le lien ou le code iframe d\'une vidéo pour commencer.'
              : 'Aucun document. Ajoutez un PDF pour commencer.'}
          </p>
        </Card>
      ) : (
        <Card className="divide-y divide-gray-100">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 p-4 transition-colors ${
                highlightId === item.id ? 'bg-primary/5' : ''
              }`}
            >
              {/* Flèches de réordonnancement : désactivées aux extrémités de la liste entière */}
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => handleMove(item, 'up')}
                  disabled={isFirstOverall(index) || movingId !== null}
                  className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                  aria-label={`Monter ${item.title}`}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(item, 'down')}
                  disabled={isLastOverall(index) || movingId !== null}
                  className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                  aria-label={`Descendre ${item.title}`}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              <span className="w-8 shrink-0 text-center text-sm tabular-nums text-gray-400">
                {item.position}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-secondary">{item.title}</p>
                <p className="mt-0.5 truncate text-xs text-gray-400">
                  {item.type === 'document'
                    ? [item.original_name, formatSize(item.file_size)].filter(Boolean).join(' · ')
                    : item.embed_url}
                </p>
              </div>

              <Badge variant={item.type === 'audio' ? 'info' : item.type === 'document' ? 'neutral' : 'primary'} size="sm">
                {item.type === 'video' ? 'Vidéo' : item.type === 'audio' ? 'Audio' : 'PDF'}
              </Badge>

              <div className="flex shrink-0 gap-1">
                {item.type === 'document' ? (
                  <button
                    type="button"
                    onClick={() => handleOpenDocument(item)}
                    disabled={busyId === item.id}
                    className="rounded-lg px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50"
                  >
                    {busyId === item.id ? 'Ouverture...' : 'Ouvrir'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPreview(item)}
                    className="rounded-lg px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100"
                  >
                    Aperçu
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openEdit(item)}
                  className="rounded-lg px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100"
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  disabled={busyId === item.id}
                  className="rounded-lg px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {lastPage > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => loadItems(page - 1)} disabled={page === 1}>
            Précédent
          </Button>
          <span className="px-3 text-sm text-gray-500">
            Page {page} sur {lastPage}
          </span>
          <Button variant="outline" size="sm" onClick={() => loadItems(page + 1)} disabled={page === lastPage}>
            Suivant
          </Button>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? 'Modifier le contenu' : isMedia ? 'Ajouter une vidéo ou un audio' : 'Ajouter un document'}
        size="lg"
      >
        <div className="space-y-5">
          <Input
            label="Titre"
            placeholder={isMedia ? 'Ex : Leçon 1 — Introduction' : 'Ex : Fiche de révision n°1'}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          {isMedia ? (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-secondary">Type de contenu</label>
                <div className="flex gap-2">
                  {(['video', 'audio'] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setType(value)}
                      className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                        type === value
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {value === 'video' ? 'Vidéo' : 'Audio'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-secondary">Lien ou code iframe</label>
                <textarea
                  value={embedUrl}
                  onChange={(e) => setEmbedUrl(e.target.value)}
                  rows={3}
                  placeholder='https://player.mediadelivery.net/embed/... ou <iframe src="..."></iframe>'
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-secondary focus:border-primary focus:outline-none"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Collez l&apos;URL du lecteur ou le code embed complet : le lien est extrait automatiquement.
                </p>
              </div>
            </>
          ) : (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-secondary">
                Document PDF {editing && <span className="text-gray-400">(non modifiable)</span>}
              </label>
              {editing ? (
                <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                  {editing.original_name ?? 'Document'} — pour remplacer le fichier, supprimez ce contenu et
                  ajoutez-le à nouveau.
                </p>
              ) : (
                <>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:text-primary hover:file:bg-primary/20"
                  />
                  <p className="mt-1 text-xs text-gray-500">Format PDF uniquement, 20 Mo maximum.</p>
                </>
              )}
            </div>
          )}

          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Enregistrement...' : editing ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={preview !== null} onClose={() => setPreview(null)} title={preview?.title} size="xl">
        {preview?.embed_url && (
          <div className={preview.type === 'audio' ? '' : 'aspect-video'}>
            <iframe
              src={preview.embed_url}
              title={preview.title}
              // allow-same-origin rend au lecteur SA propre origine (Bunny, Vimeo),
              // pas la nôtre : sans lui son origine est opaque et le player casse.
              // Les domaines de l'institut sont déjà refusés à la saisie.
              sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className={`w-full rounded-lg border border-gray-200 ${preview.type === 'audio' ? 'h-32' : 'h-full'}`}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
