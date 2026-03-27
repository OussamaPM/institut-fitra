'use client';

import { useState, useEffect } from 'react';
import ProgramCard from '@/components/public/ProgramCard';
import { programsApi } from '@/lib/api/programs';
import { Program } from '@/lib/types';

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [filteredPrograms, setFilteredPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // États des filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');

  // Charger les programmes
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        setLoading(true);
        const response = await programsApi.getAll();
        const programsArray = Array.isArray(response) ? response : response.data || [];
        const activePrograms = programsArray.filter((p) => p.active);
        setPrograms(activePrograms);
        setFilteredPrograms(activePrograms);
      } catch (err) {
        console.error('Erreur:', err);
        setError('Impossible de charger les programmes.');
      } finally {
        setLoading(false);
      }
    };

    fetchPrograms();
  }, []);

  // Appliquer les filtres
  useEffect(() => {
    let result = [...programs];

    // Filtre par recherche (nom ou description)
    if (searchQuery) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filtre par matière
    if (subjectFilter !== 'all') {
      result = result.filter((p) => p.subject === subjectFilter);
    }

    // Filtre par prix
    const getPrice = (p: typeof programs[0]) => typeof p.price === 'string' ? parseFloat(p.price) : p.price;
    if (priceFilter === 'free') {
      result = result.filter((p) => getPrice(p) === 0);
    } else if (priceFilter === 'paid') {
      result = result.filter((p) => getPrice(p) > 0);
    } else if (priceFilter === 'low') {
      result = result.filter((p) => getPrice(p) > 0 && getPrice(p) <= 100);
    } else if (priceFilter === 'medium') {
      result = result.filter((p) => getPrice(p) > 100 && getPrice(p) <= 300);
    } else if (priceFilter === 'high') {
      result = result.filter((p) => getPrice(p) > 300);
    }

    setFilteredPrograms(result);
  }, [searchQuery, subjectFilter, priceFilter, programs]);

  // Extraire les matières uniques
  const uniqueSubjects = Array.from(new Set(programs.map((p) => p.subject).filter(Boolean)));

  // Réinitialiser les filtres
  const resetFilters = () => {
    setSearchQuery('');
    setSubjectFilter('all');
    setPriceFilter('all');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des programmes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-600">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 md:py-12 bg-background min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="font-playfair text-3xl sm:text-4xl md:text-5xl font-bold text-secondary mb-3 md:mb-4">
            Nos Programmes
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto text-sm sm:text-base px-4">
            Découvrez l'ensemble de nos formations en langue arabe et sciences islamiques.
          </p>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6 md:mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Recherche */}
            <div className="sm:col-span-2">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Rechercher
              </label>
              <input
                type="text"
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nom ou description..."
                className="w-full px-3 sm:px-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm sm:text-base"
              />
            </div>

            {/* Filtre par matière */}
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Matière
              </label>
              <select
                id="subject"
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm sm:text-base"
              >
                <option value="all">Toutes</option>
                {uniqueSubjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtre par prix */}
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Prix
              </label>
              <select
                id="price"
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm sm:text-base"
              >
                <option value="all">Tous</option>
                <option value="free">Gratuit</option>
                <option value="low">&lt; 100€</option>
                <option value="medium">100-300€</option>
                <option value="high">&gt; 300€</option>
              </select>
            </div>
          </div>

          {/* Bouton réinitialiser */}
          {(searchQuery || subjectFilter !== 'all' || priceFilter !== 'all') && (
            <div className="mt-3 sm:mt-4 text-right">
              <button
                onClick={resetFilters}
                className="text-sm text-primary hover:text-primary/80 transition-colors py-1"
              >
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </div>

        {/* Résultats */}
        <div className="mb-4 md:mb-6">
          <p className="text-gray-600 text-sm sm:text-base">
            {filteredPrograms.length} programme{filteredPrograms.length > 1 ? 's' : ''} trouvé
            {filteredPrograms.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Grille de programmes */}
        {filteredPrograms.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {filteredPrograms.map((program) => (
              <ProgramCard key={program.id} program={program} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-8 sm:p-12 text-center">
            <svg
              className="w-12 sm:w-16 h-12 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-gray-500 text-base sm:text-lg mb-2">Aucun programme trouvé</p>
            <p className="text-gray-400 text-xs sm:text-sm">
              Essayez de modifier vos critères de recherche.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
