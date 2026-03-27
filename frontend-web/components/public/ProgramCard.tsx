import Link from 'next/link';
import { Program } from '@/lib/types';

interface ProgramCardProps {
  program: Program;
}

export default function ProgramCard({ program }: ProgramCardProps) {
  // Formater le prix
  const formattedPrice = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(parseFloat(program.price));

  // Extraire les jours de cours du schedule
  const courseDays = program.schedule?.map((s) => s.day).join(', ') || 'Non défini';

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group">
      {/* Header avec matière */}
      <div className="bg-gradient-to-r from-primary to-primary/80 p-4">
        <div className="flex items-center justify-between">
          <span className="text-white font-semibold text-sm uppercase tracking-wide">
            {program.subject || 'Cours'}
          </span>
          {program.active && (
            <span className="bg-success text-white text-xs px-2 py-1 rounded-full">
              Actif
            </span>
          )}
        </div>
      </div>

      {/* Contenu */}
      <div className="p-6 space-y-4">
        {/* Titre */}
        <h3 className="font-playfair text-xl font-semibold text-secondary group-hover:text-primary transition-colors">
          {program.name}
        </h3>

        {/* Description */}
        <p className="text-gray-600 text-sm line-clamp-3">
          {program.description || 'Aucune description disponible.'}
        </p>

        {/* Professeur */}
        {program.teacher && (
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span>
              {program.teacher.first_name} {program.teacher.last_name}
            </span>
          </div>
        )}

        {/* Horaires */}
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="capitalize">{courseDays}</span>
        </div>

        {/* Prix */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div>
            <div className="text-2xl font-bold text-primary">{formattedPrice}</div>
            {program.max_installments > 1 && (
              <div className="text-xs text-gray-500">
                Jusqu&apos;à {program.max_installments} mensualités
              </div>
            )}
          </div>

          {/* Bouton */}
          <Link
            href={`/programs/${program.id}`}
            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm"
          >
            En savoir plus
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
