'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import { Button, Input, Card } from '@/components/ui';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login({ email, password });
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la connexion.');
    } finally {
      setIsLoading(false);
    }
  };

  const getHomeUrl = () => {
    if (typeof window === 'undefined') return '/';
    const protocol = window.location.protocol;
    const hostname = window.location.hostname.replace(/^app\./, '');
    const port = window.location.port;
    const portSuffix = port ? `:${port}` : '';
    return `${protocol}//${hostname}${portSuffix}/`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo / Title */}
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
          <p className="text-secondary text-lg">
            Plateforme d'apprentissage en ligne
          </p>
        </div>

        <Card>
          <div className="mb-6">
            <h2 className="font-playfair text-2xl font-semibold text-secondary mb-2">
              Connexion
            </h2>
            <p className="text-gray-600">
              Connectez-vous pour accéder à votre espace personnel
            </p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-error/10 border border-error rounded-lg">
              <p className="text-error text-sm">{error}</p>
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

            <Input
              label="Mot de passe"
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isLoading}
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="ml-2 text-sm text-secondary">
                  Se souvenir de moi
                </span>
              </label>

              <Link
                href="/auth/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                Mot de passe oublié ?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={isLoading}
              disabled={isLoading}
            >
              {isLoading ? 'Connexion en cours...' : 'Se connecter'}
            </Button>
          </form>

        </Card>

        <div className="mt-6 text-center text-sm text-gray-500">
          <a href={getHomeUrl()} className="hover:text-primary transition-colors">
            ← Retour à l'accueil
          </a>
        </div>
      </div>
    </div>
  );
}
