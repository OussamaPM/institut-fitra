'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui';
import { libraryApi } from '@/lib/api/library';
import { LibraryCategory, LibraryFolder } from '@/lib/types';

/** « Ressources » côté admin s'affiche « Documents » pour les élèves. */
const TABS: { key: LibraryCategory; label: string }[] = [
  { key: 'media', label: 'Vidéo/Audio' },
  { key: 'resource', label: 'Documents' },
];

function StudentLibraryContent() {
  const searchParams = useSearchParams();
  const requested = searchParams.get('category');

  // Vidéo/Audio est l'onglet ouvert par défaut ; ?category permet de revenir sur
  // l'onglet d'où l'on vient après avoir consulté un dossier.
  const [category, setCategory] = useState<LibraryCategory>(
    requested === 'resource' ? 'resource' : 'media',
  );
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Deux clics rapides entre les onglets : seule la dernière requête doit gagner,
  // sinon les dossiers d'une catégorie s'affichent sous l'autre.
  const requestRef = useRef(0);

  const loadFolders = useCallback(async () => {
    const requestId = ++requestRef.current;

    try {
      setIsLoading(true);
      setError('');
      const data = await libraryApi.getStudentFolders(category);

      if (requestRef.current !== requestId) return;
      setFolders(data);
    } catch (err) {
      if (requestRef.current !== requestId) return;
      console.error('Failed to load library folders:', err);
      setFolders([]);
      setError('Impossible de charger la bibliothèque.');
    } finally {
      if (requestRef.current === requestId) setIsLoading(false);
    }
  }, [category]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="font-playfair text-3xl font-semibold text-secondary">Bibliothèque</h1>
        <p className="mt-1.5 text-sm text-gray-500">
          Les contenus mis à votre disposition par l&apos;institut.
        </p>
        <div className="mt-4 h-px w-full bg-gradient-to-r from-primary/30 via-primary/10 to-transparent" />
      </div>

      <div className="inline-flex gap-1 rounded-xl bg-badge/60 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setCategory(tab.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              category === tab.key
                ? 'bg-card text-primary shadow-sm'
                : 'text-gray-500 hover:text-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-card p-5 shadow-sm">
              <div className="flex gap-3">
                <div className="h-11 w-11 shrink-0 rounded-xl bg-gray-100" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 w-3/4 rounded bg-gray-100" />
                  <div className="h-3 w-1/3 rounded bg-gray-50" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : folders.length === 0 ? (
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
          <p className="text-sm text-gray-500">
            Aucun contenu disponible pour le moment dans cette catégorie.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {folders.map((folder) => (
            <Link key={folder.id} href={`/student/library/${folder.id}`} className="group block">
              <Card className="h-full p-5 transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#8d6a59] to-primary text-white shadow-sm">
                    {category === 'media' ? (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.8}
                          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.8}
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-medium text-secondary transition-colors group-hover:text-primary">
                      {folder.title}
                    </h2>
                    <p className="mt-1 text-xs text-gray-500">
                      {folder.items_count ?? 0} contenu{(folder.items_count ?? 0) > 1 ? 's' : ''}
                    </p>
                  </div>
                  <svg
                    className="mt-1 h-4 w-4 shrink-0 text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StudentLibraryPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-gray-500">Chargement...</p>}>
      <StudentLibraryContent />
    </Suspense>
  );
}
