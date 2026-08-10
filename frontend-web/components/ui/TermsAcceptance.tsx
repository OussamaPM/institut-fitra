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
      {/* Rappel de l'engagement */}
      <div>
        <p className="font-semibold text-secondary text-sm mb-1">Votre engagement</p>
        <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
          Votre inscription vous engage au paiement de{' '}
          <strong>la totalité de la cotisation</strong>, même en plusieurs fois.{' '}
          <strong>L'inscription ne pourra plus être annulée ni remboursée.</strong>
        </p>
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