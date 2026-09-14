'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button, Card } from '@/components/ui';
import { libraryApi } from '@/lib/api/library';
import { LibraryFolder, LibraryItem } from '@/lib/types';

/** Taille lisible d'un document. */
const formatSize = (bytes: number | null): string => {
  if (!bytes) return '';
  const mo = bytes / (1024 * 1024);
  return mo >= 1 ? `${mo.toFixed(1)} Mo` : `${Math.round(bytes / 1024)} Ko`;
};

const PlayIcon = () => (
  <svg className="h-7 w-7 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const SoundIcon = () => (
  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M6.5 8.5H4a1 1 0 00-1 1v5a1 1 0 001 1h2.5L11 19V5L6.5 8.5z"
    />
  </svg>
);

export default function StudentLibraryFolderPage() {
  const params = useParams();
  const folderId = Number(params.folderId);

  const [folder, setFolder] = useState<Pick<LibraryFolder, 'id' | 'category' | 'title'> | null>(null);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);

  const isMedia = folder?.category === 'media';

  const loadItems = useCallback(async (targetPage: number) => {
    try {
      setIsLoading(true);
      setError('');
      const data = await libraryApi.getStudentItems(folderId, targetPage);
      setItems(data.items.data);
      setPage(data.items.current_page);
      setLastPage(data.items.last_page);
      setTotal(data.items.total);
      setFolder(data.folder);
      setPlayingId(null);
    } catch (err: any) {
      console.error('Failed to load library items:', err);
      setError(
        err?.response?.status === 404
          ? 'Ce dossier n\'est pas disponible.'
          : 'Impossible de charger les contenus.',
      );
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
    setError('Ce dossier n\'est pas disponible.');
  }, [folderId, loadItems]);

  /** Ouvre un document : le lien est demandé à l'API puis suivi dans un nouvel onglet. */
  const handleOpenDocument = async (item: LibraryItem) => {
    const tab = window.open('', '_blank');

    try {
      setOpeningId(item.id);
      setError('');
      const url = await libraryApi.getDownloadUrl(item.id);

      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch (err) {
      console.error('Failed to open document:', err);
      tab?.close();
      setError('Impossible d\'ouvrir ce document.');
    } finally {
      setOpeningId(null);
    }
  };

  /** Numéro d'ordre affiché, continu d'une page à l'autre. */
  const displayIndex = (index: number) => (page - 1) * 12 + index + 1;

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div>
        <Link
          href={folder ? `/student/library?category=${folder.category}` : '/student/library'}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-primary"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Bibliothèque
        </Link>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-playfair text-3xl font-semibold text-secondary">
            {folder?.title ?? 'Dossier'}
          </h1>
          {total > 0 && (
            <span className="rounded-full bg-badge px-3 py-1 text-xs font-medium text-primary">
              {total} contenu{total > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="mt-3 h-px w-full bg-gradient-to-r from-primary/30 via-primary/10 to-transparent" />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="animate-pulse overflow-hidden rounded-2xl bg-card shadow-sm">
              <div className="aspect-video bg-gray-100" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-2/3 rounded bg-gray-100" />
                <div className="h-3 w-1/3 rounded bg-gray-50" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 && !error ? (
        <Card className="p-16 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-badge text-primary">
            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.7}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </span>
          <p className="text-sm text-gray-500">Ce dossier ne contient encore aucun contenu.</p>
        </Card>
      ) : isMedia ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {items.map((item, index) => (
            <article
              key={item.id}
              className="group overflow-hidden rounded-2xl bg-card shadow-sm transition-all hover:shadow-md"
            >
              {playingId === item.id && item.embed_url ? (
                <div className={item.type === 'audio' ? 'bg-secondary p-4' : 'aspect-video'}>
                  <iframe
                    src={item.embed_url}
                    title={item.title}
                    // allow-same-origin rend au lecteur SA propre origine (Bunny, Vimeo),
                    // pas la nôtre : sans lui son origine est opaque et le player casse
                    // (localStorage, cookies, DRM). Les domaines de l'institut sont déjà
                    // refusés à la saisie, seul cas où ce token serait risqué.
                    sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                    className={`w-full border-0 ${item.type === 'audio' ? 'h-24 rounded-lg' : 'h-full'}`}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPlayingId(item.id)}
                  aria-label={`${item.type === 'audio' ? 'Écouter' : 'Regarder'} ${item.title}`}
                  className="relative flex aspect-video w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#8d6a59] via-primary to-[#5f4439]"
                >
                  {/* Filet décoratif, purement visuel */}
                  <span className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5" />
                  <span className="absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-black/5" />

                  <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-sm transition-transform duration-200 group-hover:scale-110">
                    {item.type === 'audio' ? <SoundIcon /> : <PlayIcon />}
                  </span>

                  <span className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/25 text-xs font-semibold text-white">
                    {displayIndex(index)}
                  </span>
                  <span className="absolute right-3 top-3 rounded-full bg-black/25 px-2.5 py-1 text-[11px] font-medium text-white">
                    {item.type === 'audio' ? 'Audio' : 'Vidéo'}
                  </span>
                </button>
              )}

              <div className="flex items-center justify-between gap-3 p-4">
                <h2 className="min-w-0 truncate text-sm font-medium text-secondary" title={item.title}>
                  {item.title}
                </h2>
                {playingId === item.id && (
                  <button
                    type="button"
                    onClick={() => setPlayingId(null)}
                    className="shrink-0 text-xs text-gray-400 transition-colors hover:text-primary"
                  >
                    Fermer
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <article
              key={item.id}
              className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm transition-all hover:shadow-md"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-badge text-primary">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.7}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </span>

              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-medium text-secondary" title={item.title}>
                  <span className="mr-2 text-gray-300">{displayIndex(index)}</span>
                  {item.title}
                </h2>
                <p className="mt-0.5 truncate text-xs text-gray-400">
                  {[item.original_name, formatSize(item.file_size)].filter(Boolean).join(' · ') || 'Document PDF'}
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenDocument(item)}
                disabled={openingId === item.id}
              >
                {openingId === item.id ? 'Ouverture...' : 'Ouvrir'}
              </Button>
            </article>
          ))}
        </div>
      )}

      {lastPage > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadItems(page - 1)}
            disabled={page === 1 || isLoading}
          >
            Précédent
          </Button>
          <span className="px-3 text-sm text-gray-500">
            Page {page} sur {lastPage}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadItems(page + 1)}
            disabled={page === lastPage || isLoading}
          >
            Suivant
          </Button>
        </div>
      )}
    </div>
  );
}
