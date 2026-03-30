'use client';

import Image from 'next/image';

export default function ComingSoon() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Motif décoratif en arrière-plan */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute top-20 left-10 text-[200px] font-arabic-calibri text-primary select-none">
          بِسْمِ اللَّهِ
        </div>
        <div className="absolute bottom-20 right-10 text-[150px] font-arabic-calibri text-primary select-none">
          الرَّحْمَنِ الرَّحِيمِ
        </div>
      </div>

      {/* Contenu principal */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        {/* Logo */}
        <div className="mb-8 animate-fade-in">
          <Image
            src="/images/logo-fitra.webp"
            alt="Institut Fitra"
            width={280}
            height={80}
            className="h-20 md:h-24 w-auto"
            priority
          />
        </div>

        {/* Titre principal */}
        <h1 className="font-playfair text-3xl md:text-5xl lg:text-6xl text-secondary text-center mb-4 animate-fade-in-up">
          Bientôt disponible
        </h1>

        {/* Sous-titre */}
        <p className="text-lg md:text-xl text-gray-600 text-center max-w-2xl mb-8 animate-fade-in-up animation-delay-200">
          Nous préparons quelque chose d'exceptionnel pour vous.
          <br className="hidden md:block" />
          Notre plateforme d'apprentissage sera bientôt en ligne.
        </p>

        {/* Citation islamique */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 md:p-10 shadow-lg max-w-3xl mb-10 animate-fade-in-up animation-delay-400">
          <div className="font-arabic-calibri text-2xl md:text-3xl text-primary text-center leading-loose" dir="rtl">
            <span>﴿ فَأَقِمۡ وَجۡهَكَ لِلدِّینِ حَنِیفاۚ فِطۡرَتَ ٱللَّهِ ٱلَّتِی فَطَرَ ٱلنَّاسَ عَلَیۡهَاۚ لَا تَبۡدِیلَ لِخَلۡقِ ٱللَّهِۚ ذَ ٰ⁠لِكَ ٱلدِّینُ ٱلۡقَیِّمُ وَلَـٰكِنَّ أَكۡثَرَ ٱلنَّاسِ لَا یَعۡلَمُونَ ﴾</span>
            <br />
            <span className="text-lg md:text-xl">[الروم ٣٠]</span>
          </div>
        </div>

        {/* Les 5 piliers en aperçu */}
        <div className="mt-8 grid grid-cols-5 gap-4 md:gap-8 max-w-3xl animate-fade-in-up animation-delay-600">
          {[
            { icon: '📖', label: 'Quran' },
            { icon: '📜', label: 'Hadith' },
            { icon: '⚖️', label: 'Fiqh' },
            { icon: '🌙', label: 'Tazkiyah' },
            { icon: '💡', label: 'Fikr' },
          ].map((pillar, index) => (
            <div key={index} className="text-center group">
              <div className="w-12 h-12 md:w-16 md:h-16 mx-auto bg-white rounded-full shadow-md flex items-center justify-center text-xl md:text-2xl group-hover:scale-110 transition-transform">
                {pillar.icon}
              </div>
              <p className="mt-2 text-xs md:text-sm text-gray-600 font-medium">{pillar.label}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="mt-12 text-gray-400 text-sm">
          © {new Date().getFullYear()} Institut Fitra. Tous droits réservés.
        </p>
      </div>

      {/* Styles pour les animations */}
      <style jsx global>{`
        @font-face {
          font-family: 'SamirMaghribi';
          src: url('/fonts/samir-khouaja-maghribi-bold.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
          unicode-range: U+0600-U+065F, U+0660-U+06D3, U+FB50-U+FDFF, U+FE70-U+FEFF;
        }

        .font-arabic-calibri {
          font-family: 'SamirMaghribi', 'Amiri', serif;
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }

        .animation-delay-200 {
          animation-delay: 0.2s;
          opacity: 0;
        }

        .animation-delay-400 {
          animation-delay: 0.4s;
          opacity: 0;
        }

        .animation-delay-600 {
          animation-delay: 0.6s;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
