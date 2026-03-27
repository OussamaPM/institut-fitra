import Link from 'next/link';
import ProgramCard from './ProgramCard';
import { programsApi } from '@/lib/api/programs';

export default async function ProgramsSection() {
  // Récupérer les programmes actifs (limité à 3 pour la une)
  let featuredPrograms = [];
  try {
    const programs = await programsApi.getAll();
    const programsArray = Array.isArray(programs) ? programs : programs.data || [];
    featuredPrograms = programsArray.filter((p) => p.active).slice(0, 3);
  } catch (error) {
    console.error('Erreur lors du chargement des programmes:', error);
  }

  return (
    <section className="py-12 sm:py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Titre de section */}
        <div className="text-center mb-16">
          <h2 className="font-playfair text-2xl sm:text-3xl md:text-4xl font-bold text-secondary mb-4">
            Nos Programmes Phares
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Découvrez notre sélection de programmes d&apos;apprentissage conçus par des experts
            pour vous accompagner dans votre parcours spirituel et linguistique.
          </p>
          <div className="w-20 h-1.5 bg-primary mx-auto rounded-full mt-6"></div>
        </div>

        {/* Grille de programmes - centrée selon le nombre */}
        {featuredPrograms.length > 0 ? (
          <div className={`grid grid-cols-1 gap-8 mb-12 ${
            featuredPrograms.length === 1
              ? 'md:grid-cols-1 max-w-md mx-auto'
              : featuredPrograms.length === 2
                ? 'md:grid-cols-2 max-w-3xl mx-auto'
                : 'md:grid-cols-2 lg:grid-cols-3'
          }`}>
            {featuredPrograms.map((program) => (
              <ProgramCard key={program.id} program={program} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            Aucun programme disponible pour le moment.
          </div>
        )}

        {/* Bouton Voir tous les programmes */}
        <div className="text-center">
          <Link
            href="/programs"
            className="inline-flex items-center px-8 py-3 border-2 border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition-all font-bold"
          >
            Voir tous les programmes
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
