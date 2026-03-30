import Link from 'next/link';

export default function SeminairePage() {
  return (
    <div className="bg-background min-h-screen">

      {/* Hero */}
      <section className="bg-gradient-to-br from-secondary to-secondary/90 text-white py-16 sm:py-20 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-primary/80 font-medium uppercase tracking-widest text-xs sm:text-sm mb-4">
            Institut Fitra
          </p>
          <h1 className="font-playfair text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
            Les Séminaires
          </h1>
          <p className="text-white/80 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Des immersions intensives pour approfondir vos connaissances en sciences islamiques,
            en compagnie de savants et dans un cadre propice à la réflexion.
          </p>
        </div>
      </section>

      {/* Pourquoi les séminaires */}
      <section className="py-14 sm:py-18 md:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
            <div>
              <h2 className="font-playfair text-2xl sm:text-3xl font-bold text-secondary mb-5">
                Pourquoi les séminaires ?
              </h2>
              <div className="space-y-4 text-gray-600 text-sm sm:text-base leading-relaxed">
                <p>
                  Le savoir islamique ne se transmet pas uniquement à travers les cours réguliers.
                  Les séminaires offrent une opportunité unique de s'immerger pleinement dans une
                  discipline, sous la direction d'un enseignant expérimenté.
                </p>
                <p>
                  En quelques jours d'étude intensive, vous progressez autant qu'en plusieurs mois
                  de cours hebdomadaires, grâce à la concentration et à l'interaction directe avec
                  le savoir et les autres apprenants.
                </p>
                <p>
                  C'est aussi un moment de rencontre, de fraternité et de motivation renouvelée
                  dans votre chemin vers la connaissance.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: '📖', titre: 'Immersion totale', desc: 'Plusieurs jours de travail concentré sur une thématique' },
                { icon: '🤝', titre: 'Transmission directe', desc: "Échanges avec l'enseignant et questions approfondies" },
                { icon: '🌍', titre: 'Accessible en ligne', desc: 'Participez depuis n\'importe où dans le monde' },
                { icon: '🎓', titre: 'Tous niveaux', desc: 'Séminaires adaptés aux débutants comme aux avancés' },
              ].map((item) => (
                <div key={item.titre} className="bg-white rounded-xl shadow-sm p-5 text-center">
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <h3 className="font-semibold text-secondary text-sm mb-1">{item.titre}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Les thématiques */}
      <section className="py-14 sm:py-18 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="font-playfair text-2xl sm:text-3xl font-bold text-secondary mb-3">
              Les Thématiques Abordées
            </h2>
            <p className="text-gray-500 text-sm sm:text-base max-w-2xl mx-auto">
              Nos séminaires couvrent les grandes disciplines des sciences islamiques
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {[
              {
                titre: 'Langue Arabe',
                desc: 'Grammaire, morphologie, éloquence et stylistique — des fondamentaux aux subtilités avancées.',
                couleur: 'bg-amber-50 border-amber-200',
                accent: 'text-amber-700',
              },
              {
                titre: 'Sciences du Coran',
                desc: 'Tajwid, mémorisation, sciences coraniques et exégèse des textes sacrés.',
                couleur: 'bg-green-50 border-green-200',
                accent: 'text-green-700',
              },
              {
                titre: 'Hadith & Sira',
                desc: 'Étude des hadiths, de leur chaîne de transmission et de la biographie prophétique.',
                couleur: 'bg-blue-50 border-blue-200',
                accent: 'text-blue-700',
              },
              {
                titre: 'Fiqh & Usul',
                desc: 'Jurisprudence islamique et fondements de la déduction légale (Usul al-Fiqh).',
                couleur: 'bg-purple-50 border-purple-200',
                accent: 'text-purple-700',
              },
              {
                titre: 'Aqida',
                desc: 'Fondements de la croyance islamique selon la tradition des savants.',
                couleur: 'bg-rose-50 border-rose-200',
                accent: 'text-rose-700',
              },
              {
                titre: 'Spiritualité & Éthique',
                desc: 'Purification de l\'âme, bonnes mœurs et développement spirituel.',
                couleur: 'bg-orange-50 border-orange-200',
                accent: 'text-orange-700',
              },
            ].map((theme) => (
              <div
                key={theme.titre}
                className={`rounded-xl border p-5 sm:p-6 ${theme.couleur}`}
              >
                <h3 className={`font-playfair text-lg font-semibold mb-2 ${theme.accent}`}>
                  {theme.titre}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">{theme.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Le prochain séminaire */}
      <section className="py-14 sm:py-18 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="font-playfair text-2xl sm:text-3xl font-bold text-secondary mb-3">
              Le Prochain Séminaire
            </h2>
          </div>
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
            <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-4 text-white">
              <span className="text-xs font-medium uppercase tracking-widest opacity-80">
                Prochainement
              </span>
            </div>
            <div className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                <div className="flex-1">
                  <h3 className="font-playfair text-xl sm:text-2xl font-bold text-secondary mb-3">
                    Séminaire d'Introduction à la Langue Arabe
                  </h3>
                  <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-5">
                    Un séminaire intensif de 3 jours pour poser les fondements de la langue arabe :
                    alphabet, lecture, structure de la phrase nominale et verbale. Accessible à tous,
                    aucun prérequis nécessaire.
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs sm:text-sm">
                    <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full">
                      📅 Date à confirmer
                    </span>
                    <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full">
                      🌐 En ligne (Zoom)
                    </span>
                    <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium">
                      Tous niveaux
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-gray-100">
                <Link
                  href="/contact"
                  className="inline-flex items-center px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
                >
                  M'informer de la date
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Les séminaires disponibles (placeholders) */}
      <section className="py-14 sm:py-18 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="font-playfair text-2xl sm:text-3xl font-bold text-secondary mb-3">
              Séminaires Disponibles
            </h2>
            <p className="text-gray-500 text-sm sm:text-base">
              Notre catalogue de séminaires sera bientôt disponible
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-6 sm:p-8 flex flex-col items-center justify-center text-center min-h-[180px]"
              >
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm font-medium">Séminaire à venir</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              href="/contact"
              className="inline-flex items-center px-6 py-2.5 border border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition-colors font-medium text-sm"
            >
              Proposer une thématique
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
