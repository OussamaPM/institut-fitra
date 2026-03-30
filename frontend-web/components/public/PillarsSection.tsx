'use client';

import Link from 'next/link';

const pillars = [
  {
    icon: '📖',
    title: 'Quran',
    description: 'Tafsir et méditation profonde des textes.',
  },
  {
    icon: '📜',
    title: 'Hadith & Sīra',
    description: 'Faire de la Sunna un véritable mode de vie.',
  },
  {
    icon: '⚖️',
    title: 'Fiqh',
    description: 'Adorer Allah avec science et conscience.',
  },
  {
    icon: '🌿',
    title: 'Tazkiyah',
    description: 'Purifier son être en cheminant vers Allāh.',
  },
  {
    icon: '🧠',
    title: 'Fikr',
    description: 'Déconstruire et reconstruire sur des bases saines.',
  },
];

export default function PillarsSection() {
  return (
    <section id="cursus" className="py-10 sm:py-12 md:py-13 bg-background scroll-mt-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-playfair font-bold text-secondary mb-4 sm:mb-6">
            Nos 5 Thématiques Majeures
          </h2>
          <p className="text-gray-500 text-sm sm:text-base">
            Un équilibre entre texte, pratique et réflexion pour une compréhension globale de notre religion.
          </p>
          <div className="w-16 sm:w-20 h-0.5 sm:h-1 bg-primary mx-auto rounded-full mt-4 sm:mt-6"></div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
          {pillars.map((pillar, index) => (
            <div
              key={index}
              className={`group p-4 sm:p-6 rounded-2xl bg-white shadow-md border border-transparent hover:border-primary/20 hover:shadow-xl transition-all text-center ${index === 4 ? 'col-span-2 sm:col-span-1' : ''}`}
            >
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-background rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-6 mx-auto group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                <span className="text-xl sm:text-2xl">{pillar.icon}</span>
              </div>
              <h3 className="text-sm sm:text-base md:text-lg font-bold mb-1 sm:mb-2 text-primary">{pillar.title}</h3>
              <p className="text-xs text-gray-600 line-clamp-2">{pillar.description}</p>
            </div>
          ))}
        </div>

        {/* Bouton Explorer le cursus */}
        <div className="text-center mt-14 sm:mt-16">
          <Link
            href="/cursus"
            className="group inline-flex items-center gap-3 px-8 sm:px-10 py-4 bg-primary text-white rounded-xl hover:bg-primary/90 active:scale-95 transition-all font-semibold text-base sm:text-lg shadow-lg shadow-primary/30 ring-2 ring-primary/20 hover:ring-primary/40"
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Explorer en détail le cursus
            <svg className="w-5 h-5 flex-shrink-0 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
