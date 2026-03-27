'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function PublicFooter() {
  const currentYear = new Date().getFullYear();

  const getLoginUrl = () => {
    if (typeof window === 'undefined') return '#';
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port;
    const portSuffix = port ? `:${port}` : '';
    return `${protocol}//app.${hostname}${portSuffix}/auth/login`;
  };

  return (
    <footer className="bg-secondary text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 md:py-12">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {/* À propos */}
          <div className="space-y-3 sm:space-y-4 col-span-2 sm:col-span-2 md:col-span-1">
            <Image
              src="/images/logo-fitra.webp"
              alt="Institut Fitra"
              width={280}
              height={80}
              className="h-14 sm:h-16 md:h-20 w-auto brightness-0 invert"
            />
            <p className="text-gray-300 text-xs sm:text-sm">
              Une plateforme d'apprentissage en ligne dédiée à l'enseignement islamique et arabe.
            </p>
          </div>

          {/* Navigation rapide */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="font-playfair font-semibold text-base sm:text-lg">Navigation</h3>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
              <li>
                <Link href="/" className="text-gray-300 hover:text-white transition-colors">
                  Accueil
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-300 hover:text-white transition-colors">
                  À propos
                </Link>
              </li>
              <li>
                <Link href="/programs" className="text-gray-300 hover:text-white transition-colors">
                  Programmes
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-300 hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Espace Étudiant */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="font-playfair font-semibold text-base sm:text-lg">Espace Étudiant</h3>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
              <li>
                <a
                  href={getLoginUrl()}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Connexion
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3 sm:space-y-4 col-span-2 sm:col-span-1">
            <h3 className="font-playfair font-semibold text-base sm:text-lg">Contact</h3>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-300">
              <li className="flex items-center space-x-2">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="truncate">contact@institut-fitra.fr</span>
              </li>
              <li className="flex items-center space-x-2">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>+33 1 23 45 67 89</span>
              </li>
              <li className="flex items-center space-x-2">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Paris, France</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Ligne de séparation */}
        <div className="border-t border-gray-700 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center text-xs sm:text-sm text-gray-400">
          <p>&copy; {currentYear} Institut Fitra. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
}
