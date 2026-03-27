'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Button, Input, Card } from '@/components/ui';

export default function RegisterPage() {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    password_confirmation: '',
    first_name: '',
    last_name: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.password_confirmation) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    if (!formData.first_name || !formData.last_name) {
      setError('Le prénom et le nom sont requis.');
      return;
    }

    setIsLoading(true);

    try {
      // Toujours envoyer role: 'student' par défaut
      const dataToSend: any = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        password: formData.password,
        password_confirmation: formData.password_confirmation,
        role: 'student', // Toujours étudiant
      };

      if (formData.phone) dataToSend.phone = formData.phone;

      await register(dataToSend);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de l\'inscription.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <h1 className="font-playfair text-4xl font-semibold text-primary mb-2">
            Institut Amana
          </h1>
          <p className="text-secondary text-lg">
            Plateforme d'apprentissage en ligne
          </p>
        </div>

        <Card>
          <div className="mb-6">
            <h2 className="font-playfair text-2xl font-semibold text-secondary mb-2">
              Créer un compte élève
            </h2>
            <p className="text-gray-600">
              Inscrivez-vous pour commencer votre parcours d'apprentissage
            </p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-error/10 border border-error rounded-lg">
              <p className="text-error text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <Input
              label="Adresse email"
              type="email"
              name="email"
              id="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="votre@email.com"
              required
              disabled={isLoading}
            />

            {/* Password */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Mot de passe"
                type="password"
                name="password"
                id="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                helperText="Au moins 8 caractères"
                required
                disabled={isLoading}
              />

              <Input
                label="Confirmer le mot de passe"
                type="password"
                name="password_confirmation"
                id="password_confirmation"
                value={formData.password_confirmation}
                onChange={handleChange}
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Prénom"
                type="text"
                name="first_name"
                id="first_name"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="Jean"
                required
                disabled={isLoading}
              />

              <Input
                label="Nom"
                type="text"
                name="last_name"
                id="last_name"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="Dupont"
                required
                disabled={isLoading}
              />
            </div>

            {/* Phone */}
            <Input
              label="Téléphone (optionnel)"
              type="tel"
              name="phone"
              id="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+33 6 12 34 56 78"
              disabled={isLoading}
            />

            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={isLoading}
              disabled={isLoading}
            >
              {isLoading ? 'Inscription en cours...' : 'Créer mon compte'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Vous avez déjà un compte ?{' '}
              <Link
                href="/auth/login"
                className="text-primary font-medium hover:underline"
              >
                Se connecter
              </Link>
            </p>
          </div>
        </Card>

        <div className="mt-6 text-center text-sm text-gray-500">
          <Link href="/" className="hover:text-primary transition-colors">
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
