'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { programLevelsApi } from '@/lib/api/program-levels';
import { reinscriptionApi } from '@/lib/api/reinscription';
import { ProgramLevel } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowLeft, CreditCard, Calendar, Clock, User, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function ReinscriptionCheckoutPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();

  const programId = parseInt(params.programId as string);
  const levelId = parseInt(params.levelId as string);

  const [level, setLevel] = useState<ProgramLevel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [installmentsCount, setInstallmentsCount] = useState(1);
  const [selectedClassId, setSelectedClassId] = useState<number | undefined>(undefined);

  useEffect(() => {
    loadLevel();
  }, [programId, levelId]);

  const loadLevel = async () => {
    try {
      setIsLoading(true);
      setError('');
      const levelData = await programLevelsApi.getById(programId, levelId);
      setLevel(levelData);
      setInstallmentsCount(1);
      // Pré-sélectionner la classe si une seule activation
      if (levelData.activations && levelData.activations.length === 1) {
        setSelectedClassId(levelData.activations[0].class_id);
      }
    } catch (err: any) {
      console.error('Error loading level:', err);
      setError('Impossible de charger les informations du niveau.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!level) return;

    // Si plusieurs activations, une classe doit être sélectionnée
    if (level.activations && level.activations.length > 1 && !selectedClassId) {
      setError('Veuillez sélectionner une classe.');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const response = await reinscriptionApi.createCheckoutSession({
        program_level_id: level.id,
        installments_count: installmentsCount,
        class_id: selectedClassId,
      });

      // Redirect to Stripe Checkout
      window.location.href = response.checkout_url;
    } catch (err: any) {
      console.error('Error creating checkout session:', err);
      setError(err.response?.data?.message || 'Impossible de créer la session de paiement.');
      setIsProcessing(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const getInstallmentAmount = () => {
    if (!level) return 0;
    return level.price / installmentsCount;
  };

  const formatSchedule = (schedule: ProgramLevel['schedule']) => {
    if (!schedule || schedule.length === 0) return 'Non défini';
    return schedule.map(s => {
      const day = s.day.charAt(0).toUpperCase() + s.day.slice(1);
      return `${day} ${s.start_time} - ${s.end_time}`;
    }).join(', ');
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !level) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-error/10 border border-error rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-error mx-auto mb-4" />
            <p className="text-error font-medium">{error}</p>
            <button
              onClick={() => router.back()}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Retour
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!level) {
    return null;
  }

  const profile = user?.student_profile;

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-4"
          >
            <ArrowLeft size={20} />
            <span className="text-sm md:text-base">Retour</span>
          </button>
          <h1 className="text-2xl md:text-3xl font-playfair font-semibold text-secondary">
            Inscription au niveau suivant
          </h1>
          <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">
            Continuez votre progression
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-error/10 border border-error rounded-lg">
            <p className="text-error text-sm">{error}</p>
          </div>
        )}

        {/* Level Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="p-4 md:p-6 border-b border-gray-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-block px-2 py-1 text-xs rounded-full bg-primary/10 text-primary font-medium mb-2">
                  Niveau {level.level_number}
                </span>
                <h2 className="text-lg md:text-xl font-semibold text-secondary">
                  {level.name}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {level.program?.name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl md:text-3xl font-bold text-primary">
                  {formatPrice(level.price)}
                </p>
              </div>
            </div>
          </div>

          {level.description && (
            <div className="p-4 md:p-6 border-b border-gray-100">
              <p className="text-sm md:text-base text-gray-600">
                {level.description}
              </p>
            </div>
          )}

          <div className="p-4 md:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {level.schedule && level.schedule.length > 0 && (
                <div className="flex items-start gap-3">
                  <Calendar size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Emploi du temps</p>
                    <p className="text-sm text-secondary">{formatSchedule(level.schedule)}</p>
                  </div>
                </div>
              )}

              {level.teacher && (
                <div className="flex items-start gap-3">
                  <User size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Enseignant</p>
                    <p className="text-sm text-secondary">
                      {level.teacher.teacher_profile?.first_name} {level.teacher.teacher_profile?.last_name}
                    </p>
                  </div>
                </div>
              )}

              {level.activations && level.activations.length > 0 && (
                <div className="flex items-start gap-3">
                  <Clock size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">
                      {level.activations.length > 1 ? 'Choisissez votre classe' : 'Classe'}
                    </p>
                    {level.activations.length === 1 ? (
                      <p className="text-sm text-secondary">
                        {level.activations[0].class?.name} ({level.activations[0].class?.academic_year})
                      </p>
                    ) : (
                      <select
                        value={selectedClassId ?? ''}
                        onChange={(e) => setSelectedClassId(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="mt-1 text-sm border border-gray-300 rounded-lg px-2 py-1 text-secondary"
                      >
                        <option value="">Sélectionner une classe</option>
                        {level.activations.map((activation) => (
                          <option key={activation.class_id} value={activation.class_id}>
                            {activation.class?.name} ({activation.class?.academic_year})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Student Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="p-4 md:p-6 border-b border-gray-100">
            <h3 className="font-semibold text-secondary">Vos informations</h3>
          </div>
          <div className="p-4 md:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Nom complet</p>
                <p className="text-sm text-secondary font-medium">
                  {profile?.first_name} {profile?.last_name}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm text-secondary">{user?.email}</p>
              </div>
              {profile?.phone && (
                <div>
                  <p className="text-xs text-gray-500">Téléphone</p>
                  <p className="text-sm text-secondary">{profile.phone}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payment Options */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="p-4 md:p-6 border-b border-gray-100">
            <h3 className="font-semibold text-secondary">Mode de paiement</h3>
          </div>
          <div className="p-4 md:p-6">
            <div className="space-y-3">
              {/* Single payment */}
              <label
                className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                  installmentsCount === 1
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="installments"
                    value={1}
                    checked={installmentsCount === 1}
                    onChange={() => setInstallmentsCount(1)}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                  <div>
                    <p className="font-medium text-secondary">Paiement unique</p>
                    <p className="text-xs text-gray-500">Payez la totalité maintenant</p>
                  </div>
                </div>
                <span className="font-bold text-secondary">
                  {formatPrice(level.price)}
                </span>
              </label>

              {/* Installments options */}
              {level.max_installments > 1 && (
                <>
                  {[2, 3, 4].filter(n => n <= level.max_installments).map((n) => (
                    <label
                      key={n}
                      className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                        installmentsCount === n
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="installments"
                          value={n}
                          checked={installmentsCount === n}
                          onChange={() => setInstallmentsCount(n)}
                          className="w-4 h-4 text-primary focus:ring-primary"
                        />
                        <div>
                          <p className="font-medium text-secondary">Paiement en {n} fois</p>
                          <p className="text-xs text-gray-500">
                            {n} versements de {formatPrice(level.price / n)}
                          </p>
                        </div>
                      </div>
                      <span className="font-bold text-secondary">
                        {formatPrice(level.price / n)}/mois
                      </span>
                    </label>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-gray-50 rounded-xl p-4 md:p-6 mb-6">
          <h3 className="font-semibold text-secondary mb-4">Récapitulatif</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{level.name}</span>
              <span className="text-secondary">{formatPrice(level.price)}</span>
            </div>
            {installmentsCount > 1 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Paiement en {installmentsCount} fois</span>
                <span className="text-secondary">{formatPrice(getInstallmentAmount())}/mois</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="flex justify-between font-semibold">
                <span className="text-secondary">
                  {installmentsCount > 1 ? 'Premier versement' : 'Total'}
                </span>
                <span className="text-primary text-lg">
                  {formatPrice(getInstallmentAmount())}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Checkout Button */}
        <button
          onClick={handleCheckout}
          disabled={isProcessing}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 active:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Redirection vers le paiement...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              Procéder au paiement
            </>
          )}
        </button>

        {/* Security note */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
          <CheckCircle size={14} />
          <span>Paiement sécurisé par Stripe</span>
        </div>
      </div>
    </div>
  );
}
