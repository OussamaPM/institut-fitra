'use client';

import { useEffect, useState } from 'react';

/**
 * Bloc d'acceptation des CGV affiché juste avant le bouton de paiement.
 *
 * Rappelle explicitement les trois engagements pris par l'élève au moment du
 * paiement (totalité du prix, absence de rétractation, absence de remboursement)
 * puis exige une case à cocher qui conditionne l'accès au paiement.
 */
export default function TermsAcceptance({
  checked,
  onChange,
  disabled,
  highlightError,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Encadre le bloc en rouge quand l'utilisateur tente de payer sans cocher */
  highlightError?: boolean;
}) {
  // Le backoffice est servi depuis app.<domaine>, où /cgv n'existe pas : on retire
  // le sous-domaine pour pointer vers les CGV du site vitrine. Le calcul est fait
  // après montage pour que le rendu serveur et le rendu client concordent.
  const [cgvUrl, setCgvUrl] = useState('/cgv');

  useEffect(() => {
    const { protocol, hostname, port } = window.location;
    if (!hostname.startsWith('app.')) return;
    const portSuffix = port ? `:${port}` : '';
    setCgvUrl(`${protocol}//${hostname.slice(4)}${portSuffix}/cgv`);
  }, []);

  return (
    <div className="space-y-3">
      {/* Avertissement explicite */}
      <div className="rounded-lg border-2 border-error/40 bg-error/5 p-3 sm:p-4">
        <div className="flex items-start gap-2.5">
          <svg
            className="w-5 h-5 text-error flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.74-3L13.74 4a2 2 0 00-3.48 0L3.33 16a2 2 0 001.74 3z"
            />
          </svg>
          <div className="min-w-0">
            <p className="font-semibold text-secondary text-sm mb-1.5">Votre engagement</p>
            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
              Votre inscription vous engage au paiement de{' '}
              <strong>la totalité de la cotisation</strong>, même en plusieurs fois.{' '}
              <strong>L'inscription ne pourra plus être annulée ni remboursée.</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Case à cocher */}
      <label
        className={`flex items-start gap-3 p-3 sm:p-4 border-2 rounded-lg transition-colors ${
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
        } ${
          highlightError && !checked
            ? 'border-error bg-error/5'
            : checked
              ? 'border-primary bg-primary/5'
              : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          required
          aria-describedby="terms-acceptance-text"
          className="mt-0.5 w-5 h-5 flex-shrink-0 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary cursor-pointer disabled:cursor-not-allowed"
        />
        <span id="terms-acceptance-text" className="text-xs sm:text-sm text-gray-700 leading-relaxed">
          J'ai lu et j'accepte les{' '}
          <a
            href={cgvUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-primary font-medium underline hover:text-primary/80"
          >
            Conditions Générales de Vente
          </a>
          . Je comprends qu'
          <strong>après paiement, aucun remboursement ne pourra être demandé</strong>.{' '}
          <span className="text-error">*</span>
        </span>
      </label>
    </div>
  );
}