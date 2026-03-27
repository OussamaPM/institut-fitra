'use client';

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
    <section id="cursus" className="py-12 sm:py-16 md:py-24 bg-white scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-playfair font-bold text-secondary mb-4 sm:mb-6">
            Nos 5 Thématiques Majeures
          </h2>
          <p className="text-gray-500 text-sm sm:text-base">
            Un équilibre entre texte, pratique et réflexion pour une compréhension globale de notre religion.
          </p>
          <div className="w-16 sm:w-20 h-1 sm:h-1.5 bg-primary mx-auto rounded-full mt-4 sm:mt-6"></div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
          {pillars.map((pillar, index) => (
            <div
              key={index}
              className={`group p-4 sm:p-6 rounded-2xl bg-background border border-transparent hover:border-primary/20 hover:bg-white hover:shadow-xl transition-all text-center ${index === 4 ? 'col-span-2 sm:col-span-1' : ''}`}
            >
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-xl sm:rounded-2xl shadow-sm flex items-center justify-center mb-3 sm:mb-6 mx-auto group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                <span className="text-xl sm:text-2xl">{pillar.icon}</span>
              </div>
              <h3 className="text-sm sm:text-base md:text-lg font-bold mb-1 sm:mb-2 text-primary">{pillar.title}</h3>
              <p className="text-xs text-gray-600 line-clamp-2">{pillar.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
