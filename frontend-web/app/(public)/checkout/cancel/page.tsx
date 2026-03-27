import Link from 'next/link';

export default function CheckoutCancelPage() {
  return (
    <div className="py-8 sm:py-12 bg-background min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-md p-6 sm:p-8 md:p-12 text-center">
          {/* Cancel icon */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h1 className="font-playfair text-2xl sm:text-3xl font-bold text-secondary mb-3 sm:mb-4">
            Paiement annulé
          </h1>

          <p className="text-gray-600 mb-6 sm:mb-8 max-w-md mx-auto text-sm sm:text-base">
            Vous avez annulé le processus de paiement. Aucun montant n'a été débité de votre compte.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8 text-left">
            <h2 className="font-semibold text-blue-800 mb-2 sm:mb-3 text-sm sm:text-base">Besoin d'aide ?</h2>
            <p className="text-xs sm:text-sm text-blue-700 mb-2 sm:mb-3">
              Si vous avez rencontré un problème lors du paiement ou si vous avez des questions, n'hésitez pas à nous contacter.
            </p>
            <ul className="text-xs sm:text-sm text-blue-600 space-y-1">
              <li>• Problème technique ?</li>
              <li>• Questions sur un programme ?</li>
              <li>• Besoin d'un autre mode de paiement ?</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link
              href="/programs"
              className="inline-flex items-center justify-center px-6 sm:px-8 py-2.5 sm:py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm sm:text-base"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Voir les programmes
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-6 sm:px-8 py-2.5 sm:py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Nous contacter
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
