'use client';

import { useRouter } from 'next/navigation';

export default function PaymentRecoveryCancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 md:p-8 text-center">
        {/* Cancel Icon */}
        <div className="w-16 h-16 md:w-20 md:h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 md:w-10 md:h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        <h1 className="text-2xl md:text-3xl font-playfair font-semibold text-secondary mb-3">
          Paiement annule
        </h1>

        <p className="text-gray-600 mb-6">
          Vous avez annule le paiement de regularisation.
          Votre echeance reste en attente et vous pourrez la regulariser ulterieurement.
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-amber-700">
            N&apos;oubliez pas de regulariser votre paiement pour maintenir votre inscription active.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => router.push('/student/dashboard')}
            className="w-full px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 active:bg-primary/80 transition-colors"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    </div>
  );
}
