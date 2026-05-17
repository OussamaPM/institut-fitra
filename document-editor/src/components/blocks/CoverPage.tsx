'use client';

import { CoverStyle, DocumentConfig } from '@/types';

interface CoverPageProps {
  config: DocumentConfig;
  style: CoverStyle;
}

export default function CoverPage({ config, style }: CoverPageProps) {
  return (
    <div
      className="page-a4 relative flex flex-col"
      style={{ backgroundColor: style.backgroundColor }}
    >
      {/* Bordure droite */}
      <div
        className="absolute right-0 top-0 bottom-0"
        style={{
          width: `${style.borderWidth}px`,
          backgroundColor: style.borderColor,
        }}
      />

      {/* Contenu */}
      <div className="flex-1 flex flex-col items-center pt-12 px-12">
        {/* Logo */}
        {config.logoUrl && (
          <div className="mb-8">
            <img
              src={config.logoUrl}
              alt="Logo"
              className="h-16 w-auto"
            />
          </div>
        )}

        {/* Nom de la série */}
        {config.seriesName && (
          <div className="text-center mb-2">
            <h2
              className="font-playfair font-semibold"
              style={{
                color: style.titleColor,
                fontSize: `${style.titleFontSize}px`,
              }}
            >
              {config.seriesName}
            </h2>
          </div>
        )}

        {/* Sous-titre de série */}
        {config.subtitle && (
          <div className="text-center mb-2">
            <p
              className="font-inter"
              style={{
                color: style.subtitleColor,
                fontSize: `${style.subtitleFontSize}px`,
              }}
            >
              {config.subtitle}
            </p>
          </div>
        )}

        {/* Numéro de série */}
        {config.seriesNumber && (
          <div className="text-center mb-16">
            <p
              className="font-playfair"
              style={{
                color: style.subtitleColor,
                fontSize: `${style.subtitleFontSize}px`,
              }}
            >
              ({config.seriesNumber})
            </p>
          </div>
        )}

        {/* Espace flexible */}
        <div className="flex-1" />

        {/* Titre principal */}
        <div className="text-center mb-auto mt-8">
          <h1
            className="font-playfair font-bold uppercase tracking-wide"
            style={{
              color: style.mainTitleColor,
              fontSize: `${style.mainTitleFontSize}px`,
            }}
          >
            {config.title}
          </h1>
        </div>

        {/* Espace flexible */}
        <div className="flex-1" />
      </div>

      {/* Copyright */}
      {config.copyright && (
        <div className="absolute bottom-8 right-16">
          <p
            className="text-sm"
            style={{ color: style.subtitleColor }}
          >
            © {config.copyright}
          </p>
        </div>
      )}
    </div>
  );
}
