import Link from 'next/link';

export default function ProgramYearSection() {
  return (
    <section id="programme" className="py-12 sm:py-16 md:py-24 bg-gray-100 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 sm:mb-10 md:mb-12 gap-4">
          <div className="max-w-2xl">
            <span className="text-primary font-bold tracking-widest uppercase text-xs sm:text-sm">Le début du voyage</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-playfair font-bold text-secondary mt-1 sm:mt-2">Programme de la 1ère Année</h2>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-3 sm:gap-4 md:gap-8">
          {/* Colonne gauche */}
          <div className="space-y-3 sm:space-y-4">
            {/* Quran */}
            <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border-l-4 border-primary flex items-start space-x-3 sm:space-x-4">
              <div className="bg-primary/10 p-2 sm:p-3 rounded-lg sm:rounded-xl text-primary font-bold text-sm sm:text-base flex-shrink-0">01</div>
              <div className="min-w-0">
                <h4 className="font-bold text-secondary text-base sm:text-lg md:text-xl">Quran</h4>
                <p className="text-gray-600 text-sm sm:text-base">
                  Étude approfondie de sourate <span className="font-medium text-primary">AD-DUHA</span> jusqu&apos;à{' '}
                  <span className="font-medium text-primary">AN-NĀS</span>.
                </p>
              </div>
            </div>

            {/* Hadith / Sira */}
            <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border-l-4 border-primary flex items-start space-x-3 sm:space-x-4">
              <div className="bg-primary/10 p-2 sm:p-3 rounded-lg sm:rounded-xl text-primary font-bold text-sm sm:text-base flex-shrink-0">02</div>
              <div className="min-w-0">
                <h4 className="font-bold text-secondary text-base sm:text-lg md:text-xl">Hadith / Sīra</h4>
                <p className="text-gray-600 text-sm sm:text-base">
                  L&apos;étude détaillée de la vie exemplaire du <span className="italic text-primary">Prophète ﷺ</span>.
                </p>
              </div>
            </div>

            {/* Fiqh */}
            <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border-l-4 border-primary flex items-start space-x-3 sm:space-x-4">
              <div className="bg-primary/10 p-2 sm:p-3 rounded-lg sm:rounded-xl text-primary font-bold text-sm sm:text-base flex-shrink-0">03</div>
              <div className="min-w-0">
                <h4 className="font-bold text-secondary text-base sm:text-lg md:text-xl">Fiqh (Rite Malékite)</h4>
                <p className="text-gray-600 text-sm sm:text-base">
                  Étude des chapitres fondamentaux : <span className="font-medium">Purification et Prière</span>.
                </p>
              </div>
            </div>
          </div>

          {/* Colonne droite */}
          <div className="space-y-3 sm:space-y-4">
            {/* Tazkiyah & Aqida */}
            <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border-l-4 border-primary flex items-start space-x-3 sm:space-x-4 h-fit">
              <div className="bg-primary/10 p-2 sm:p-3 rounded-lg sm:rounded-xl text-primary font-bold text-sm sm:text-base flex-shrink-0">04</div>
              <div className="min-w-0">
                <h4 className="font-bold text-secondary text-base sm:text-lg md:text-xl">Tazkiyah & Aqida</h4>
                <p className="text-gray-600 text-sm sm:text-base">
                  Les bases du dogme et de la purification intérieure via l&apos;introduction du{' '}
                  <span className="italic">concis d&apos;Al-Akhdari</span>.
                </p>
              </div>
            </div>

            {/* Fikr */}
            <div className="bg-secondary p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg border-l-4 border-white flex items-start space-x-3 sm:space-x-4 text-white">
              <div className="bg-white/10 p-2 sm:p-3 rounded-lg sm:rounded-xl text-white font-bold text-sm sm:text-base flex-shrink-0">05</div>
              <div className="min-w-0">
                <h4 className="font-bold text-base sm:text-lg md:text-xl">Fikr (Pensée)</h4>
                <p className="text-gray-300 text-sm sm:text-base">
                  Une <span className="font-bold text-white">conférence trimestrielle</span> exclusive sur un sujet de société défini.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bouton inscription */}
        <div className="text-center mt-10 sm:mt-12">
          <Link
            href="/programs"
            className="group inline-flex items-center gap-3 px-8 sm:px-10 py-4 bg-primary text-white rounded-xl hover:bg-primary/90 active:scale-95 transition-all font-semibold text-base sm:text-lg shadow-lg shadow-primary/30 ring-2 ring-primary/20 hover:ring-primary/40"
          >
            Je m&apos;inscris au cursus
            <svg className="w-5 h-5 flex-shrink-0 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
