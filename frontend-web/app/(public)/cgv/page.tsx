import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Conditions Générales de Vente | Institut Fitra",
  description:
    "Conditions d'inscription à l'Institut Fitra : engagement à payer la totalité du prix, absence de rétractation et de remboursement après paiement.",
};

const CONTACT_EMAIL = 'contact@institut-fitra.fr';
const UPDATED_AT = '10 août 2026';

function Article({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-playfair text-lg sm:text-xl font-semibold text-secondary mb-2">
        {n}. {title}
      </h2>
      <div className="space-y-3 text-sm sm:text-base text-gray-700 leading-relaxed">{children}</div>
    </section>
  );
}

export default function CGVPage() {
  return (
    <div className="py-8 sm:py-12 bg-background min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {/* En-tête */}
          <div className="bg-gradient-to-r from-primary to-primary/80 p-6 sm:p-8 text-white">
            <h1 className="font-playfair text-2xl sm:text-3xl font-bold mb-1">
              Conditions Générales de Vente
            </h1>
            <p className="text-white/80 text-sm">Mise à jour : {UPDATED_AT}</p>
          </div>

          {/* L'essentiel */}
          <div className="p-5 sm:p-8 border-b border-gray-100">
            <div className="rounded-lg border-2 border-error/40 bg-error/5 p-4 sm:p-5">
              <p className="font-semibold text-secondary text-sm sm:text-base mb-2">
                L'essentiel, à lire avant de payer
              </p>
              <ul className="space-y-1.5 text-sm text-gray-700 list-disc list-inside">
                <li>
                  Votre inscription vous engage à payer{' '}
                  <strong>la totalité du prix de la formation</strong>.
                </li>
                <li>
                  <strong>Aucune rétractation</strong> n'est possible après paiement.
                </li>
                <li>
                  <strong>Aucun remboursement</strong>, total ou partiel, ne sera accordé.
                </li>
              </ul>
            </div>
          </div>

          {/* Articles */}
          <div className="p-5 sm:p-8 space-y-6 sm:space-y-8">
            <Article n={1} title="Inscription">
              <p>
                L'inscription se fait en ligne depuis la page de la formation. Elle devient ferme et
                définitive dès la validation du paiement. Votre compte élève est alors créé et
                l'accès à l'espace élève vous est ouvert immédiatement.
              </p>
              <p>
                En vous inscrivant, vous acceptez les présentes conditions. Cette acceptation est
                confirmée par la case à cocher affichée avant le paiement.
              </p>
            </Article>

            <Article n={2} title="Prix et paiement">
              <p>
                Le prix indiqué sur la page de la formation couvre l'intégralité de la formation, sur
                toute sa durée. Il est forfaitaire : il n'est pas calculé à la séance.
              </p>
              <p>
                Le paiement s'effectue par carte bancaire, en une fois ou en plusieurs versements
                sans frais selon la formule choisie. Le paiement en plusieurs fois est une simple
                facilité :{' '}
                <strong>il ne réduit pas votre engagement et ne peut pas être interrompu</strong>.
              </p>
            </Article>

            <Article n={3} title="Engagement à payer la totalité">
              <p className="font-medium text-secondary">
                Toute inscription payée vous engage personnellement à régler la totalité du prix de
                la formation.
              </p>
              <p>
                Cet engagement reste entier quelles que soient les circonstances : abandon en cours
                d'année, absence aux séances, non-connexion à la plateforme, changement de situation
                personnelle ou professionnelle, horaires devenus incompatibles, difficulté technique
                de votre côté.
              </p>
              <p>
                Si vous avez choisi le paiement en plusieurs fois, les versements restants demeurent
                dus à leurs échéances, même si vous cessez de suivre les cours.
              </p>
            </Article>

            <Article n={4} title="Pas de rétractation">
              <p>
                Vous demandez expressément que la formation démarre immédiatement, dès votre
                paiement, sans attendre l'expiration d'un quelconque délai. L'accès à votre compte,
                aux cours, aux supports et aux replays vous est ouvert dès cet instant.
              </p>
              <p className="font-medium text-secondary">
                En cochant la case d'acceptation avant de payer, vous renoncez expressément à tout
                droit de rétractation. Aucune rétractation ne pourra être exercée après le paiement.
              </p>
            </Article>

            <Article n={5} title="Pas de remboursement">
              <p className="font-medium text-secondary">
                Toute somme versée est définitivement acquise. Aucun remboursement, total ou
                partiel, ne sera accordé, pour quelque motif que ce soit.
              </p>
              <p>
                Aucun avoir, report sur une autre formation ou transfert à une autre personne ne sera
                accordé, sauf accord écrit et exceptionnel de l'Institut.
              </p>
              <p className="text-sm text-gray-500 italic">
                Seule exception : si l'Institut annule définitivement la formation avant son
                démarrage, les sommes versées sont intégralement restituées.
              </p>
            </Article>

            <Article n={6} title="Défaut de paiement">
              <p>
                En cas d'échec d'un prélèvement, vous êtes prévenu par email et un lien de
                régularisation est mis à disposition dans votre espace élève. Sans régularisation,
                l'accès à la plateforme peut être suspendu — les sommes dues restant exigibles.
              </p>
            </Article>

            <Article n={7} title="Déroulement des cours">
              <p>
                Les cours ont lieu à distance, aux jours et horaires indiqués sur la page de la
                formation. Vous devez disposer d'un équipement et d'une connexion adaptés.
              </p>
              <p>
                Une séance peut exceptionnellement être reportée ou déplacée (indisponibilité de
                l'enseignant, fêtes religieuses, contrainte technique), dès lors que le volume global
                d'enseignement est respecté. Un report n'ouvre droit à aucun remboursement.
              </p>
              <p>
                Vos identifiants sont personnels. Le partage de compte et l'enregistrement ou la
                diffusion des cours et des supports sont interdits, sous peine d'exclusion sans
                remboursement.
              </p>
            </Article>

            <Article n={8} title="Contact">
              <p>
                Pour toute question :{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
              <p>
                Les présentes conditions sont soumises au droit français, sous réserve des
                dispositions légales impératives.
              </p>
            </Article>

            {/* Rappel final */}
            <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 sm:p-5 text-center">
              <p className="text-sm text-gray-700">
                En validant votre paiement, vous vous engagez à régler la totalité du prix de la
                formation. Vous ne disposez d'aucun droit de rétractation et aucun remboursement ne
                sera possible.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center text-primary hover:text-primary/80 transition-colors text-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}