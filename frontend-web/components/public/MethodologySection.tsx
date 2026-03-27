export default function MethodologySection() {
  return (
    <section className="py-12 sm:py-16 md:py-24 bg-primary text-white overflow-hidden relative">
      {/* Fond décoratif arabe */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none font-amiri text-6xl sm:text-7xl md:text-9xl flex items-center justify-around whitespace-nowrap">
        <span>العلم</span> <span className="hidden sm:inline">نور</span> <span className="hidden md:inline">أمانة</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
          {/* Contenu */}
          <div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-playfair font-bold mb-6 sm:mb-8">Une pédagogie de l&apos;excellence</h2>
            <div className="space-y-5 sm:space-y-6 md:space-y-8">
              {/* Point 1 */}
              <div className="flex items-start space-x-3 sm:space-x-4">
                <div className="bg-white/10 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-base sm:text-lg md:text-xl font-bold mb-1 sm:mb-2">Progressivité Adaptée</h4>
                  <p className="text-white/70 text-sm sm:text-base">
                    Nous respectons le rythme de chaque élève. Les concepts sont introduits par paliers pour garantir une assimilation durable.
                  </p>
                </div>
              </div>

              {/* Point 2 */}
              <div className="flex items-start space-x-3 sm:space-x-4">
                <div className="bg-white/10 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5s3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18s-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-base sm:text-lg md:text-xl font-bold mb-1 sm:mb-2">Sources Authentiques</h4>
                  <p className="text-white/70 text-sm sm:text-base">
                    Toutes nos thématiques sont fondées sur les textes originaux et l&apos;héritage de nos savants, avec un focus sur le rite Malékite.
                  </p>
                </div>
              </div>

              {/* Point 3 */}
              <div className="flex items-start space-x-3 sm:space-x-4">
                <div className="bg-white/10 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-base sm:text-lg md:text-xl font-bold mb-1 sm:mb-2">Accompagnement Bienveillant</h4>
                  <p className="text-white/70 text-sm sm:text-base">
                    L&apos;apprentissage se fait dans un cadre de respect mutuel, favorisant l&apos;échange et la fraternité.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Citation */}
          <div className="bg-white/5 p-5 sm:p-6 md:p-8 rounded-2xl sm:rounded-[2rem] md:rounded-[2.5rem] border border-white/10 backdrop-blur-sm">
            <p className="text-lg sm:text-xl md:text-2xl font-playfair italic leading-relaxed mb-4 sm:mb-6">
              "L&apos;objectif de l&apos;Institut Fitra est de former des coeurs et des esprits capables de naviguer dans le monde moderne sans perdre leur boussole spirituelle."
            </p>
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20"></div>
              <div>
                <p className="font-bold text-sm sm:text-base">Direction Pédagogique</p>
                <p className="text-xs sm:text-sm text-amber-400 font-bold uppercase tracking-wider">Institut Fitra</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
