'use client';

import { useState, useEffect } from 'react';
import { contactApi, ContactMessage } from '@/lib/api/contact';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: 'Nouveau', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'En cours', color: 'bg-yellow-100 text-yellow-700' },
  resolved: { label: 'Résolu', color: 'bg-green-100 text-green-700' },
};

export default function ContactMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadMessages();
  }, [filterStatus]);

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const data = await contactApi.getAll({
        status: filterStatus !== 'all' ? filterStatus : undefined,
      });
      setMessages(data);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  };

  const openMessage = async (msg: ContactMessage) => {
    setSelected(msg);
    if (!msg.read_at) {
      try {
        await contactApi.getById(msg.id);
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, read_at: new Date().toISOString() } : m))
        );
      } catch {}
    }
  };

  const updateStatus = async (status: 'new' | 'in_progress' | 'resolved') => {
    if (!selected) return;
    setIsUpdating(true);
    try {
      const updated = await contactApi.updateStatus(selected.id, status);
      setSelected(updated);
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch {} finally {
      setIsUpdating(false);
    }
  };

  const deleteMessage = async (id: number) => {
    if (!confirm('Supprimer ce message ?')) return;
    try {
      await contactApi.delete(id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch {}
  };

  const filtered = messages.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.subject.toLowerCase().includes(q)
    );
  });

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-playfair font-bold text-secondary">Messages de contact</h1>
        <p className="text-gray-500 text-sm mt-1">Messages reçus via le formulaire du site vitrine.</p>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="all">Tous les statuts</option>
          <option value="new">Nouveau</option>
          <option value="in_progress">En cours</option>
          <option value="resolved">Résolu</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Liste */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-12 text-gray-400 text-sm">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">Aucun message.</div>
          ) : (
            filtered.map((msg) => (
              <div
                key={msg.id}
                onClick={() => openMessage(msg)}
                className={`bg-white rounded-xl border p-4 cursor-pointer hover:shadow-md transition-all ${
                  selected?.id === msg.id ? 'border-primary shadow-md' : 'border-gray-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {!msg.read_at && (
                        <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                      <p className={`text-sm font-semibold text-secondary truncate ${!msg.read_at ? '' : 'font-medium'}`}>
                        {msg.name}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{msg.email}</p>
                    <p className="text-sm text-gray-700 mt-1 truncate">{msg.subject}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_LABELS[msg.status].color}`}>
                      {STATUS_LABELS[msg.status].label}
                    </span>
                    <span className="text-xs text-gray-400">{formatDate(msg.created_at)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Détail */}
        <div className="lg:sticky lg:top-6">
          {selected ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-secondary text-base">{selected.name}</h2>
                  <a href={`mailto:${selected.email}`} className="text-primary text-sm hover:underline">
                    {selected.email}
                  </a>
                  {selected.phone && (
                    <p className="text-gray-500 text-sm">{selected.phone}</p>
                  )}
                </div>
                <button
                  onClick={() => deleteMessage(selected.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  title="Supprimer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <p className="text-xs text-gray-400 mb-1">Sujet</p>
                <p className="font-medium text-secondary text-sm">{selected.subject}</p>
              </div>

              <div className="mb-6">
                <p className="text-xs text-gray-400 mb-1">Message</p>
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{selected.message}</p>
              </div>

              <div className="mb-4">
                <p className="text-xs text-gray-400 mb-2">Statut</p>
                <div className="flex gap-2 flex-wrap">
                  {(['new', 'in_progress', 'resolved'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => updateStatus(s)}
                      disabled={isUpdating || selected.status === s}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                        selected.status === s
                          ? STATUS_LABELS[s].color + ' ring-2 ring-offset-1 ring-primary/30'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {STATUS_LABELS[s].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
                <span className="text-xs text-gray-400">Reçu le {formatDate(selected.created_at)}</span>
                <a
                  href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject)}`}
                  className="text-xs bg-primary text-white px-4 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Répondre par email
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
              Sélectionnez un message pour le consulter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
