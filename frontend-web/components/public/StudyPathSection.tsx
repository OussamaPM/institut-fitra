'use client';

export default function StudyPathSection() {
  return (
    <section className="pt-12 sm:pt-14 pb-12 sm:pb-16 md:pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <div className="mb-16">
        <span className="text-primary font-bold tracking-widest uppercase text-xs sm:text-sm">Un cursus en trois étapes</span>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-playfair font-bold text-secondary mt-1 sm:mt-2">Le Parcours d'Études</h2>
      </div>

      {/* Badge centré */}
      <div className="flex justify-center mb-10">
        <div
          className="inline-flex items-center px-6 py-2 rounded-full border text-xs font-semibold uppercase tracking-widest shadow-sm"
          style={{ borderColor: '#7B5A4B', color: '#7B5A4B', backgroundColor: '#ffffff' }}
        >
          Un cursus structuré en trois étapes progressives, pour bâtir une connaissance solide et durable
        </div>
      </div>

      <div className="relative pl-8 sm:pl-12 md:pl-20">
        {/* Ligne de progression */}
        <div
          className="absolute top-5 bottom-0 w-0.5 left-3 sm:left-[20px]"
          style={{
            background: 'linear-gradient(to bottom, #7B5A4B, #d1d5db)',
          }}
        />

        {/* ÉTAPE 1 : Tronc Commun */}
        <div className="mb-20 relative">
          <div
            className="absolute top-0 z-10 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 -left-8 sm:-left-12 md:-left-20 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base shadow-lg border-4 border-white"
            style={{ backgroundColor: '#7B5A4B' }}
          >
            1
          </div>
          <div className="bg-transparent p-0 sm:bg-gray-50 sm:p-8 rounded-2xl sm:border-l-4 sm:border-transparent sm:hover:border-primary sm:hover:bg-white sm:hover:shadow-lg transition-all duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 pl-4 sm:pl-0">
              <h3 className="text-xl sm:text-2xl font-playfair font-bold text-secondary">Le Tronc Commun</h3>
              <span
                className="text-white text-sm font-bold px-4 py-1 rounded-full mt-2 md:mt-0 italic shadow-sm self-start md:self-auto"
                style={{ backgroundColor: '#7B5A4B' }}
              >
                Durée : 4 ans
              </span>
            </div>
            <p className="text-sm sm:text-base text-gray-500 italic mb-8 pl-4 sm:pl-0">Le socle indispensable pour tout étudiant en quête de sens.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  icon: (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  ),
                  title: 'Quran',
                  desc: "Loin de la précipitation : un parcours sur 4 années dédié à l'étude et à la méditation des deux derniers hizb du Quran (de sourate An-Naba à sourate An-Nass).",
                },
                {
                  icon: (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    </svg>
                  ),
                  title: 'Hadith & Sīra',
                  desc: "Un cheminement au cœur de la Sunna : la première année pose les bases avec la vie du Prophète ﷺ, ouvrant la voie à trois ans d'étude approfondie des hadiths qui structurent les fondements de notre foi.",
                },
                {
                  icon: (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  ),
                  title: 'Fiqh',
                  desc: "Adorer Allah avec science et conscience : notre cursus de Fiqh débute en 1ère année par une introduction fondamentale, ouvrant la voie à 3 années d'étude approfondie des piliers de la pratique : Purification, Prière, Zakat, Jeûne, Hajj et Mariage.",
                },
                {
                  icon: (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  ),
                  title: 'Tazkiyah',
                  desc: "Purifier son être en cheminant vers Allah : posez les fondements de la foi en 1ère année avec une introduction à la 'Aqīda, avant d'entamer un cycle de 3 ans dédié à l'éducation du nafs et la purification du cœur.",
                },
              ].map((item, i) => (
                <div key={i} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-start gap-4">
                  <div className="mt-1" style={{ color: '#7B5A4B' }}>{item.icon}</div>
                  <div>
                    <h4 className="text-base sm:text-lg font-semibold text-gray-800">{item.title}</h4>
                    <p className="text-sm sm:text-base text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Bloc Fikr — pleine largeur */}
            <div className="mt-4 bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-start gap-4">
              <div className="mt-1" style={{ color: '#7B5A4B' }}>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-semibold text-gray-800">Fikr (Pensée et réflexion)</h4>
                <p className="text-sm sm:text-base text-gray-500">Libérer l'esprit des concepts importés et restaurer la pensée sur des bases authentiques : ce travail de déconstruction s'infuse d'abord de façon informelle dans toutes les matières en 1ère année, avant de devenir le cœur de conférences régulières et ciblées durant les 3 années suivantes.</p>
              </div>
            </div>
          </div>
        </div>

        {/* ÉTAPE 2 : Cycle d'Approfondissement */}
        <div className="mb-20 relative">
          <div
            className="absolute top-0 z-10 w-10 h-10 md:w-12 md:h-12 -left-12 md:-left-20 rounded-full flex items-center justify-center font-bold shadow-lg border-4 bg-white"
            style={{ color: '#7B5A4B', borderColor: '#7B5A4B' }}
          >
            2
          </div>
          <div
            className="bg-white p-8 rounded-2xl border border-l-4 hover:shadow-lg transition-all duration-300"
            style={{ borderColor: 'rgba(123,90,75,0.2)', borderLeftColor: 'transparent' }}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
              <h3 className="text-xl sm:text-2xl font-playfair font-bold text-secondary">Les Clés des Sciences : Vision Globale</h3>
              <span
                className="text-white text-sm font-bold px-4 py-1 rounded-full mt-2 md:mt-0 shadow-sm"
                style={{ backgroundColor: '#7B5A4B' }}
              >
                Durée : 2 ans
              </span>
            </div>
            <p className="text-sm sm:text-base text-gray-500 italic mb-8">Un cursus de 2 ans pour prendre de la hauteur.</p>

            <div className="space-y-4 text-gray-600 text-sm sm:text-base leading-relaxed">
              <p>
                Fort d'un premier cycle de quatre ans centré sur les connaissances fondamentales et indispensables à chaque croyant, ce nouveau parcours vous ouvre les portes d'une vision élargie et approfondie.
              </p>
              <p>
                L'objectif est d'explorer les introductions méthodologiques de l'ensemble des sciences islamiques. En ouvrant de nouvelles perspectives, ce cursus de 2 ans offre à l'étudiant une vision globale, panoramique et d'une grande précision sur la manière dont ces sciences s'articulent et se répondent.
              </p>
              <p>
                Durant ce cycle, vous explorerez les introductions fondamentales des disciplines clés : les Sciences du Quran, les Sciences du Hadith, la Science du Fiqh et de ses fondements, la Science de la Sīra…
              </p>
            </div>
          </div>
        </div>

        {/* ÉTAPE 3 : Spécialisation */}
        <div className="relative">
          <div
            className="absolute top-0 z-10 w-10 h-10 md:w-12 md:h-12 -left-12 md:-left-20 rounded-full flex items-center justify-center text-white shadow-lg border-4 border-white"
            style={{ backgroundColor: '#7B5A4B' }}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <div
            className="bg-white p-8 md:p-10 rounded-2xl border border-dashed hover:shadow-md transition-all duration-300"
            style={{ borderColor: 'rgba(123,90,75,0.35)' }}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
              <h3 className="text-xl sm:text-2xl font-playfair font-bold text-secondary">Programme de Spécialisation</h3>
              <span
                className="text-white text-sm font-bold px-4 py-1 rounded-full mt-2 md:mt-0 italic shadow-sm"
                style={{ backgroundColor: '#7B5A4B' }}
              >
                À venir
              </span>
            </div>
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}
