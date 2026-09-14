'use client';

import Link from 'next/link';
import { Card } from '@/components/ui';

const categories = [
  {
    slug: 'media',
    name: 'Vidéos & Audios',
    description: 'Cours et enregistrements hébergés sur Bunny, Vimeo ou toute autre plateforme.',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.7}
          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    slug: 'resource',
    name: 'Ressources',
    description: 'Documents PDF à consulter et télécharger : supports, fiches, annexes.',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.7}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    ),
  },
];

export default function AdminLibraryPage() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-secondary">Bibliothèque</h1>
        <p className="mt-1 text-sm text-gray-500">
          Organisez les contenus mis à disposition des élèves, par dossier et par niveau.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {categories.map((category) => (
          <Link key={category.slug} href={`/admin/library/${category.slug}`} className="group block">
            <Card className="h-full p-6 transition-all group-hover:border-primary group-hover:shadow-md">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {category.icon}
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg font-medium text-secondary group-hover:text-primary">
                    {category.name}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">{category.description}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
