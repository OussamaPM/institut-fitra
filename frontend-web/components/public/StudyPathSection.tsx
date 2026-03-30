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

      <div className="relative pl-12 md:pl-20">
        {/* Ligne de progression */}
        <div
          className="absolute top-5 bottom-0 w-0.5"
          style={{
            left: '20px',
            background: 'linear-gradient(to bottom, #7B5A4B, #d1d5db)',
          }}
        />

        {/* ÉTAPE 1 : Tronc Commun */}
        <div className="mb-20 relative">
          <div
            className="absolute top-0 z-10 w-10 h-10 md:w-12 md:h-12 -left-12 md:-left-20 rounded-full flex items-center justify-center text-white font-bold shadow-lg border-4 border-white"
            style={{ backgroundColor: '#7B5A4B' }}
          >
            1
          </div>
          <div className="bg-gray-50 p-8 rounded-2xl border-l-4 border-transparent hover:border-primary hover:bg-white hover:shadow-lg transition-all duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
              <h3 className="text-xl sm:text-2xl font-playfair font-bold text-secondary">Le Tronc Commun</h3>
              <span
                className="text-white text-sm font-bold px-4 py-1 rounded-full mt-2 md:mt-0 italic shadow-sm"
                style={{ backgroundColor: '#7B5A4B' }}
              >
                Durée : 4 ans
              </span>
            </div>
            <p className="text-gray-500 italic mb-8">Le socle indispensable pour tout étudiant en quête de sens.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  icon: (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    </svg>
                  ),
                  title: 'Sira (Vie du Prophète ﷺ)',
                  desc: "Étudier le modèle par excellence pour s'en inspirer.",
                },
                {
                  icon: (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  ),
                  title: 'Sciences du Coran',
                  desc: "Comprendre l'histoire, la révélation et la structure du Livre.",
                },
                {
                  icon: (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  ),
                  title: 'Jurisprudence (Fiqh)',
                  desc: 'Apprendre les règles de la pratique religieuse quotidienne.',
                },
                {
                  icon: (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  ),
                  title: "Éducation de l'Âme",
                  desc: 'Purification du cœur et réforme du comportement.',
                },
              ].map((item, i) => (
                <div key={i} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-start gap-4">
                  <div className="mt-1" style={{ color: '#7B5A4B' }}>{item.icon}</div>
                  <div>
                    <h4 className="font-semibold text-gray-800">{item.title}</h4>
                    <p className="text-sm text-gray-500">{item.desc}</p>
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
                <h4 className="font-semibold text-gray-800">Fikr (Pensée & Réflexion islamique)</h4>
                <p className="text-sm text-gray-500">Développer une pensée critique ancrée dans les sources islamiques pour comprendre le monde contemporain.</p>
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
              <h3 className="text-xl sm:text-2xl font-playfair font-bold text-secondary">Le Cycle d'Approfondissement</h3>
              <span
                className="text-white text-sm font-bold px-4 py-1 rounded-full mt-2 md:mt-0 shadow-sm"
                style={{ backgroundColor: '#7B5A4B' }}
              >
                Durée : 2 ans
              </span>
            </div>
            <p className="text-gray-500 italic mb-8">Après les 4 ans de tronc commun, deux voies s'offrent à vous :</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Voie A */}
              <div className="bg-gray-50 p-6 rounded-xl border-t-4 border-gray-300">
                <h4
                  className="font-bold text-lg mb-2 italic underline decoration-dotted"
                  style={{ color: '#7B5A4B' }}
                >
                  Voie de la Sagesse
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  <strong className="text-gray-800">Éducation de l'âme seule :</strong> Un cursus dédié exclusivement
                  à l'aspect spirituel et à la profondeur du cœur pendant 2 années.
                </p>
              </div>
              {/* Voie B */}
              <div className="p-6 rounded-xl text-white shadow-md" style={{ backgroundColor: '#7B5A4B' }}>
                <h4 className="font-bold text-lg mb-2 text-white italic underline decoration-dotted">
                  Voie du Savoir Global
                </h4>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.9)' }}>
                  <strong className="text-white">Éducation & Introduction aux Sciences :</strong> Une combinaison
                  équilibrée pour découvrir l'ensemble du panorama des sciences religieuses.
                </p>
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <div
                className="inline-flex items-center px-6 py-2 rounded-full border text-xs font-semibold uppercase tracking-widest shadow-sm"
                style={{ borderColor: '#7B5A4B', color: '#7B5A4B', backgroundColor: '#FAF9F6' }}
              >
                Chaque voie ouvre l'accès aux spécialisations
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 ml-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 10.293a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-5-5a1 1 0 111.414-1.414L10 14.586l4.293-4.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
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
          <div className="bg-gray-800 p-8 md:p-10 rounded-2xl text-white shadow-2xl relative overflow-hidden group">
            {/* Grille de fond décorative */}
            <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
              <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <pattern id="grid-fitra" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100" height="100" fill="url(#grid-fitra)" />
              </svg>
            </div>

            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                <h3 className="text-xl sm:text-2xl font-playfair font-bold">Programmes de Spécialisation</h3>
                <span
                  className="text-white text-sm font-bold px-4 py-1 rounded-full mt-2 md:mt-0 italic shadow-sm"
                  style={{ backgroundColor: '#7B5A4B' }}
                >
                  Durée indéterminée
                </span>
              </div>
              <p className="text-gray-300 leading-relaxed max-w-2xl mb-8">
                Pour les étudiants ayant complété le cycle d'introduction, ce palier offre une immersion académique de
                haut niveau pour devenir un expert reconnu dans un domaine spécifique.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  'Expertise en Jurisprudence (Fiqh)',
                  'Exégèse & Sciences du Coran',
                  'Hadith & Chaînes de Transmission',
                  'Théologie & Dogme (Aquida)',
                ].map((label, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-white/10 p-4 rounded-xl border border-white/5 hover:bg-white/20 transition cursor-default"
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#7B5A4B' }} />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}
