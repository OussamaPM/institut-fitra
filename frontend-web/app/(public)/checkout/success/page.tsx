'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import checkoutApi from '@/lib/api/checkout';

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<'success' | 'processing' | 'error'>('processing');
  const [error, setError] = useState('');

  useEffect(() => {
    const checkStatus = async () => {
      if (!sessionId) {
        setStatus('error');
        setError('Session de paiement introuvable.');
        setIsLoading(false);
        return;
      }

      try {
        const result = await checkoutApi.getStatus(sessionId);

        const sessionStatus = result.session?.status || result.session_status;
        const paymentStatus = result.session?.payment_status || result.payment_status;

        if (sessionStatus === 'complete' && paymentStatus === 'paid') {
          setStatus('success');
        } else if (sessionStatus === 'open') {
          setStatus('processing');
        } else {
          if (result.order?.status === 'paid' || result.order?.status === 'partial') {
            setStatus('success');
          } else {
            setStatus('error');
            setError('Le paiement n\'a pas pu être traité.');
          }
        }
      } catch (err: any) {
        console.error('Error checking status:', err);
        setStatus('success');
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="py-8 sm:py-12 bg-background min-h-screen">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-md p-6 sm:p-8 md:p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-primary mx-auto mb-4 sm:mb-6"></div>
            <h1 className="font-playfair text-xl sm:text-2xl font-bold text-secondary mb-3 sm:mb-4">
              Vérification du paiement...
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              Merci de patienter pendant que nous confirmons votre paiement.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="py-8 sm:py-12 bg-background min-h-screen">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-md p-6 sm:p-8 md:p-12 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="font-playfair text-2xl sm:text-3xl font-bold text-secondary mb-3 sm:mb-4">
              Paiement réussi !
            </h1>

            <p className="text-gray-600 mb-6 sm:mb-8 max-w-md mx-auto text-sm sm:text-base">
              Votre inscription a été confirmée. Un email contenant vos identifiants de connexion vous a été envoyé.
            </p>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
              <h2 className="font-semibold text-green-800 mb-2 sm:mb-3 text-sm sm:text-base">Prochaines étapes</h2>
              <ul className="text-left text-xs sm:text-sm text-green-700 space-y-2">
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Vérifiez votre boîte mail (et les spams) pour récupérer vos identifiants</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Connectez-vous à votre espace élève avec vos identifiants</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Consultez votre planning et rejoignez vos cours</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Link
                href="http://app.localhost:3000/auth/login"
                className="inline-flex items-center justify-center px-6 sm:px-8 py-2.5 sm:py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm sm:text-base"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Accéder à mon espace
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center px-6 sm:px-8 py-2.5 sm:py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
              >
                Retour à l'accueil
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'processing') {
    return (
      <div className="py-8 sm:py-12 bg-background min-h-screen">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-md p-6 sm:p-8 md:p-12 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <h1 className="font-playfair text-2xl sm:text-3xl font-bold text-secondary mb-3 sm:mb-4">
              Paiement en cours de traitement
            </h1>

            <p className="text-gray-600 mb-6 sm:mb-8 max-w-md mx-auto text-sm sm:text-base">
              Votre paiement est en cours de vérification. Vous recevrez un email de confirmation dès qu'il sera validé.
            </p>

            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 sm:px-8 py-2.5 sm:py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm sm:text-base"
            >
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 sm:py-12 bg-background min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-md p-6 sm:p-8 md:p-12 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          <h1 className="font-playfair text-2xl sm:text-3xl font-bold text-secondary mb-3 sm:mb-4">
            Une erreur est survenue
          </h1>

          <p className="text-gray-600 mb-6 sm:mb-8 max-w-md mx-auto text-sm sm:text-base">
            {error || 'Nous n\'avons pas pu confirmer votre paiement. Si vous avez été débité, veuillez nous contacter.'}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link
              href="/programs"
              className="inline-flex items-center justify-center px-6 sm:px-8 py-2.5 sm:py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm sm:text-base"
            >
              Réessayer
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-6 sm:px-8 py-2.5 sm:py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
            >
              Nous contacter
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="py-8 sm:py-12 bg-background min-h-screen">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-md p-6 sm:p-8 md:p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-primary mx-auto mb-4 sm:mb-6"></div>
            <p className="text-gray-600 text-sm sm:text-base">Chargement...</p>
          </div>
        </div>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
