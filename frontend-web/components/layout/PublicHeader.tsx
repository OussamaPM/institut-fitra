'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

export default function PublicHeader() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loginUrl, setLoginUrl] = useState('#');

  useEffect(() => {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname.replace(/^(app\.|www\.)/, '');
    const port = window.location.port;
    const portSuffix = port ? `:${port}` : '';
    setLoginUrl(`${protocol}//app.${hostname}${portSuffix}/auth/login`);
  }, []);

  const navLinks = [
    { href: '/', label: 'Accueil' },
    { href: '/cursus', label: 'Cursus' },
    { href: '/seminaire', label: 'Séminaire' },
    { href: '/contact', label: 'Contact' },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20 md:h-24">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/images/logo-fitra.webp"
              alt="Institut Fitra"
              width={320}
              height={90}
              className="h-10 sm:h-14 md:h-20 w-auto"
              priority
            />
          </Link>

          {/* Navigation Desktop */}
          <nav className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`font-medium transition-colors ${
                  isActive(link.href)
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-600 hover:text-primary'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <a
              href={loginUrl}
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Connexion
            </a>
          </nav>

          {/* Menu Mobile (hamburger) */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
            aria-label={isMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          >
            {isMenuOpen ? (
              <X className="w-6 h-6 text-secondary" />
            ) : (
              <Menu className="w-6 h-6 text-secondary" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation Mobile */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <nav className="px-4 py-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className={`block px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                  isActive(link.href)
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:bg-gray-100 active:bg-gray-200'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <a
              href={loginUrl}
              className="block px-4 py-3 mt-2 text-center bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Connexion
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
