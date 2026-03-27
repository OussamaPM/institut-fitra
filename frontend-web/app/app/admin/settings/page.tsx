'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Badge } from '@/components/ui';
import { settingsApi, SettingsGroups, SettingUpdate } from '@/lib/api/settings';

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsGroups | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [changes, setChanges] = useState<Record<string, string | boolean | null>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const data = await settingsApi.getAll();
      setSettings(data);
    } catch (err: any) {
      console.error('Error fetching settings:', err);
      setError('Erreur lors du chargement des paramètres');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (key: string, value: string | boolean | null) => {
    setChanges(prev => ({ ...prev, [key]: value }));
    setSuccess('');
  };

  const getValue = (key: string, originalValue: string | boolean | null): string | boolean | null => {
    if (key in changes) {
      return changes[key];
    }
    return originalValue;
  };

  const handleSave = async () => {
    if (Object.keys(changes).length === 0) return;

    try {
      setIsSaving(true);
      setError('');

      const updates: SettingUpdate[] = Object.entries(changes).map(([key, value]) => ({
        key,
        value,
      }));

      await settingsApi.update(updates);
      setSuccess('Paramètres enregistrés avec succès');
      setChanges({});
      await fetchSettings();
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setError('Erreur lors de l\'enregistrement des paramètres');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = Object.keys(changes).length > 0;

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (key: string, value: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-playfair text-2xl md:text-3xl font-semibold text-secondary mb-2">
          Configuration
        </h1>
        <p className="text-gray-600">
          Gérez les paramètres de votre plateforme
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg">
          <p className="text-error">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-success/10 border border-success/20 rounded-lg">
          <p className="text-success">{success}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Mode Maintenance */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="font-playfair text-xl font-semibold text-secondary">
                  Mode Maintenance
                </h2>
                <p className="text-sm text-gray-500">
                  Gérez l'affichage du site pour les visiteurs
                </p>
              </div>
            </div>

            {settings?.maintenance && Object.values(settings.maintenance).map((setting) => (
              <div key={setting.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-secondary">{setting.label}</p>
                  <p className="text-sm text-gray-500">{setting.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  {getValue(setting.key, setting.value) === true ? (
                    <Badge variant="warning">Activé</Badge>
                  ) : (
                    <Badge variant="success">Désactivé</Badge>
                  )}
                  <button
                    onClick={() => handleChange(setting.key, !getValue(setting.key, setting.value))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      getValue(setting.key, setting.value) === true ? 'bg-warning' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        getValue(setting.key, setting.value) === true ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Stripe Configuration */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#635BFF]/10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-[#635BFF]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                </svg>
              </div>
              <div>
                <h2 className="font-playfair text-xl font-semibold text-secondary">
                  Configuration Stripe
                </h2>
                <p className="text-sm text-gray-500">
                  Paramètres de paiement en ligne
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {settings?.stripe && Object.values(settings.stripe).map((setting) => {
                const currentValue = getValue(setting.key, setting.value) as string || '';
                return (
                  <div key={setting.key}>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      {setting.label}
                      {setting.is_secret && (
                        <span className="ml-2 text-xs text-gray-400">(Secret)</span>
                      )}
                    </label>
                    <p className="text-xs text-gray-500 mb-2">{setting.description}</p>
                    <div className="flex gap-2">
                      <div className="relative flex-1 min-w-0">
                        <input
                          type={setting.is_secret ? 'password' : 'text'}
                          value={currentValue}
                          onChange={(e) => handleChange(setting.key, e.target.value)}
                          placeholder={setting.is_set ? '••••••••' : 'Non configuré'}
                          className="w-full px-4 py-2 pr-24 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all truncate"
                        />
                        {setting.is_set && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Badge variant="success" className="text-xs">Configuré</Badge>
                          </span>
                        )}
                      </div>
                      {setting.is_set && currentValue && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(setting.key, currentValue)}
                          title="Copier"
                          className="flex-shrink-0 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-500 hover:text-primary"
                        >
                          {copiedKey === setting.key ? (
                            <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Save Button */}
        {hasChanges && (
          <div className="fixed bottom-6 right-6 z-50">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 flex items-center gap-4">
              <p className="text-sm text-gray-600">
                {Object.keys(changes).length} modification(s) non enregistrée(s)
              </p>
              <Button
                variant="secondary"
                onClick={() => {
                  setChanges({});
                  setSuccess('');
                }}
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                isLoading={isSaving}
              >
                Enregistrer
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
