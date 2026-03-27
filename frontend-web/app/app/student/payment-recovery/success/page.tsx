'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { checkoutApi } from '@/lib/api';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (sessionId) {
      verifyPayment();
    } else {
      setIsLoading(false);
    }
  }, [sessionId]);

  const verifyPayment = async () => {
    try {
      const status = await checkoutApi.getStatus(sessionId!);
      if (status.session?.payment_status === 'paid' || status.session?.status === 'complete') {
        setIsSuccess(true);
      }
    } catch (err) {
      console.error('Erreur lors de la verification du paiement:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 md:p-8 text-center">
        {isSuccess ? (
          <>
            {/* Success Icon */}
            <div className="w-16 h-16 md:w-20 md:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 md:w-10 md:h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="text-2xl md:text-3xl font-playfair font-semibold text-secondary mb-3">
              Regularisation reussie !
            </h1>

            <p className="text-gray-600 mb-6">
              Votre paiement a ete effectue avec succes. Votre echeance est maintenant regularisee.
            </p>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-700">
                Vous allez recevoir un email de confirmation de votre paiement.
              </p>
            </div>

            <button
              onClick={() => router.push('/student/dashboard')}
              className="w-full px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 active:bg-primary/80 transition-colors"
            >
              Retour au tableau de bord
            </button>
          </>
        ) : (
          <>
            {/* Warning Icon */}
            <div className="w-16 h-16 md:w-20 md:h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 md:w-10 md:h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h1 className="text-2xl md:text-3xl font-playfair font-semibold text-secondary mb-3">
              Verification en cours
            </h1>

            <p className="text-gray-600 mb-6">
              Nous n&apos;avons pas pu verifier immediatement votre paiement.
              Si vous avez effectue le paiement, celui-ci sera traite dans les minutes qui suivent.
            </p>

            <button
              onClick={() => router.push('/student/dashboard')}
              className="w-full px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 active:bg-primary/80 transition-colors"
            >
              Retour au tableau de bord
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentRecoverySuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
