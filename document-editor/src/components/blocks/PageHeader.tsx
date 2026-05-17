'use client';

import { HeaderStyle } from '@/types';

interface PageHeaderProps {
  arabicTitle: string;
  frenchTitle: string;
  style: HeaderStyle;
  showLanterns?: boolean;
}

export default function PageHeader({
  arabicTitle,
  frenchTitle,
  style,
  showLanterns = true,
}: PageHeaderProps) {
  return (
    <div className="relative mb-6">
      {/* Lanternes décoratives */}
      {showLanterns && style.showLanterns && (
        <div className="absolute right-0 top-0 flex gap-2">
          <Lantern size={40} />
          <Lantern size={50} />
        </div>
      )}

      {/* Titre arabe */}
      <div className="text-center mb-2">
        <h1
          className="font-scheherazade"
          style={{
            fontSize: `${style.arabicFontSize}px`,
            color: style.arabicColor,
          }}
          dir="rtl"
        >
          {arabicTitle}
        </h1>
      </div>

      {/* Titre français */}
      <div className="text-center">
        <p
          className="font-inter uppercase tracking-wider"
          style={{
            fontSize: `${style.frenchFontSize}px`,
            color: style.frenchColor,
          }}
        >
          {frenchTitle}
        </p>
      </div>
    </div>
  );
}

// Composant lanterne
function Lantern({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 1.8}
      viewBox="0 0 40 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Crochet */}
      <path
        d="M20 0 L20 8"
        stroke="#1e5a8a"
        strokeWidth="2"
      />
      {/* Sommet */}
      <path
        d="M12 8 L28 8 L26 16 L14 16 Z"
        fill="#1e5a8a"
      />
      {/* Corps principal */}
      <path
        d="M14 16 L14 52 Q14 60 20 60 Q26 60 26 52 L26 16 Z"
        fill="#1e5a8a"
      />
      {/* Décoration intérieure */}
      <path
        d="M17 20 L17 48 M20 20 L20 48 M23 20 L23 48"
        stroke="#ffffff"
        strokeWidth="1"
        opacity="0.3"
      />
      {/* Base */}
      <path
        d="M16 60 L24 60 L22 68 L18 68 Z"
        fill="#1e5a8a"
      />
      {/* Pendentif */}
      <circle cx="20" cy="71" r="2" fill="#1e5a8a" />
    </svg>
  );
}
