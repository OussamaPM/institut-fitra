'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button, Input, Card } from '@/components/ui';
import { authApi } from '@/lib/api/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await authApi.forgotPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Une erreur est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src="/images/logo-fitra.webp"
              alt="Institut Fitra"
              width={300}
              height={84}
              className="h-24 w-auto"
              priority
            />
          </div>
          <p className="text-secondary text-lg">Plateforme d'apprentissage en ligne</p>
        </div>

        <Card>
          <div className="mb-6">
            <h2 className="font-playfair text-2xl font-semibold text-secondary mb-2">
              Mot de passe oublié
            </h2>
            <p className="text-gray-600">
              Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </p>
          </div>

          {success ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
              <svg className="w-12 h-12 text-green-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-green-800 font-medium mb-1">Email envoyé !</p>
              <p className="text-green-700 text-sm">
                Si cette adresse email est associée à un compte, vous recevrez un lien de réinitialisation dans quelques minutes.
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Adresse email"
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                  disabled={isLoading}
                />

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  isLoading={isLoading}
                  disabled={isLoading}
                >
                  {isLoading ? 'Envoi en cours...' : 'Envoyer le lien'}
                </Button>
              </form>
            </>
          )}
        </Card>

        <div className="mt-6 text-center text-sm text-gray-500">
          <Link href="/auth/login" className="hover:text-primary transition-colors">
            ← Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
