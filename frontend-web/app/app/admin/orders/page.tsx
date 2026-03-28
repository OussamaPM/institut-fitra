'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, Button, Badge, Input } from '@/components/ui';
import { ordersApi, programsApi, classesApi } from '@/lib/api';
import { Order, OrderStats, OrderStatus, PaymentMethod, Program, ClassModel } from '@/lib/types';

// Payment method icons
const PaymentMethodIcon = ({ method }: { method: PaymentMethod }) => {
  switch (method) {
    case 'stripe':
      return (
        <span className="inline-flex items-center gap-1 text-purple-600" title="Stripe">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
          </svg>
        </span>
      );
    case 'paypal':
      return (
        <span className="inline-flex items-center gap-1 text-blue-500" title="PayPal">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 6.082-8.558 6.082h-2.19c-.2 0-.37.147-.402.344l-1.4 8.88a.385.385 0 0 0 .38.444h3.036c.362 0 .673-.26.73-.619l.03-.154.578-3.66.037-.2a.735.735 0 0 1 .726-.62h.457c2.962 0 5.28-1.204 5.96-4.684.284-1.456.137-2.673-.736-3.526z"/>
          </svg>
        </span>
      );
    case 'cash':
      return (
        <span className="inline-flex items-center gap-1 text-green-600" title="Espèces">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <circle cx="12" cy="12" r="3" />
            <path d="M6 12h.01M18 12h.01" />
          </svg>
        </span>
      );
    case 'transfer':
      return (
        <span className="inline-flex items-center gap-1 text-indigo-600" title="Virement">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 7h12M20 7l-4-4M20 7l-4 4M16 17H4M4 17l4-4M4 17l4 4" />
          </svg>
        </span>
      );
    case 'free':
      return (
        <span
          className="inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-300 rounded-full"
          title="Gratuit"
        >
          Gratuit
        </span>
      );
    default:
      return null;
  }
};

// Status badge
const StatusBadge = ({ status }: { status: OrderStatus }) => {
  const labels: Record<OrderStatus, string> = {
    paid: 'Payée',
    partial: 'Partielle',
    failed: 'Échouée',
    refunded: 'Remboursée',
  };

  // Styles personnalisés pour chaque statut
  const styles: Record<OrderStatus, string> = {
    paid: 'bg-green-100 text-green-700 border border-green-300',
    partial: 'bg-amber-100 text-amber-700 border border-amber-300',
    failed: 'bg-error/10 text-error',
    refunded: 'bg-gray-100 text-secondary',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-sm font-bold rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | ''>('');
  const [programFilter, setProgramFilter] = useState<number | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    loadData();
  }, [statusFilter, methodFilter, programFilter, searchQuery, currentPage]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [ordersData, statsData, programsData] = await Promise.all([
        ordersApi.getAll({
          status: statusFilter || undefined,
          payment_method: methodFilter || undefined,
          program_id: programFilter || undefined,
          search: searchQuery || undefined,
          page: currentPage,
          per_page: 20,
        }),
        ordersApi.getStats(),
        programsApi.getAll(),
      ]);

      setOrders(ordersData.orders);
      setTotalPages(ordersData.pagination.last_page);
      setStats(statsData);
      setPrograms(programsData.data || []);
    } catch (err: any) {
      console.error('Error loading orders:', err);
      setError('Impossible de charger les commandes.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatScheduledDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-playfair text-4xl font-semibold text-secondary mb-2">
            Commandes
          </h1>
          <p className="text-gray-600">Gérez les commandes et paiements des élèves</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          + Ajout manuel
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-1">Total commandes</p>
              <p className="text-3xl font-bold text-secondary">{stats.total_orders}</p>
            </div>
          </Card>
          <Card>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-1">Revenus totaux</p>
              <p className="text-3xl font-bold text-green-600">{formatPrice(stats.total_revenue)}</p>
            </div>
          </Card>
          <Card>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-1">Paiements planifiés</p>
              <p className="text-3xl font-bold text-amber-600">{formatPrice(stats.pending_revenue)}</p>
            </div>
          </Card>
          <Card>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-1">Par méthode</p>
              <div className="flex flex-wrap gap-3 mt-2">
                <span className="text-sm flex items-center gap-1">
                  <PaymentMethodIcon method="stripe" /> {stats.orders_by_payment_method?.stripe || 0}
                </span>
                <span className="text-sm flex items-center gap-1">
                  <PaymentMethodIcon method="paypal" /> {stats.orders_by_payment_method?.paypal || 0}
                </span>
                <span className="text-sm flex items-center gap-1">
                  <PaymentMethodIcon method="cash" /> {stats.orders_by_payment_method?.cash || 0}
                </span>
                <span className="text-sm flex items-center gap-1">
                  <PaymentMethodIcon method="transfer" /> {stats.orders_by_payment_method?.transfer || 0}
                </span>
              </div>
              <div className="mt-2">
                <span className="text-sm flex items-center gap-1">
                  <PaymentMethodIcon method="free" /> {stats.orders_by_payment_method?.free || 0}
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | '')}
              className="input"
            >
              <option value="">Tous les statuts</option>
              <option value="paid">Payée</option>
              <option value="partial">Partielle</option>
              <option value="failed">Échouée</option>
              <option value="refunded">Remboursée</option>
            </select>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value as PaymentMethod | '')}
              className="input"
            >
              <option value="">Toutes les méthodes</option>
              <option value="stripe">Stripe</option>
              <option value="paypal">PayPal</option>
              <option value="free">Gratuit</option>
              <option value="cash">Espèces</option>
              <option value="transfer">Virement</option>
            </select>
            <select
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value ? parseInt(e.target.value) : '')}
              className="input"
            >
              <option value="">Tous les programmes</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              onClick={() => {
                setStatusFilter('');
                setMethodFilter('');
                setProgramFilter('');
                setSearchQuery('');
              }}
            >
              Réinitialiser
            </Button>
          </div>
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error rounded-lg">
          <p className="text-error text-sm">{error}</p>
        </div>
      )}

      {/* Orders Table */}
      <Card>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Aucune commande trouvée</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Programme / Classe
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Montant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Paiement
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Paiements
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-secondary">
                          {order.customer_first_name} {order.customer_last_name}
                        </p>
                        <p className="text-sm text-gray-500">{order.customer_email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-secondary">{order.program?.name}</p>
                        {order.class && (
                          <p className="text-sm text-gray-500">{order.class.name}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-secondary">{formatPrice(order.total_amount)}</p>
                        {order.installments_count > 1 && (
                          <p className="text-xs text-gray-500">
                            en {order.installments_count}× de {formatPrice(order.total_amount / order.installments_count)}
                          </p>
                        )}
                        {order.program && order.total_amount !== order.program.price && order.payment_method !== 'free' && (
                          <p className="text-xs text-amber-600 font-medium">Personnalisé</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <PaymentMethodIcon method={order.payment_method} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {/* Successful payments */}
                        {order.successful_payments_count !== undefined && order.successful_payments_count > 0 && (
                          <span className="text-xs text-green-600">
                            {order.successful_payments_count} payé(s) - {formatPrice(order.paid_amount || 0)}
                          </span>
                        )}
                        {/* Scheduled payments with hover tooltip */}
                        {order.pending_payments_count !== undefined && order.pending_payments_count > 0 && (
                          <div className="relative group">
                            <span className="text-xs text-blue-600 cursor-help">
                              {order.pending_payments_count} planifié(s)
                            </span>
                            {/* Tooltip with scheduled dates */}
                            {order.payments && order.payments.filter(p => p.status === 'scheduled').length > 0 && (
                              <div className="absolute z-10 invisible group-hover:visible bg-gray-800 text-white text-xs rounded p-2 -top-2 left-full ml-2 whitespace-nowrap">
                                {order.payments
                                  .filter(p => p.status === 'scheduled')
                                  .map((payment, idx) => (
                                    <div key={idx}>
                                      {formatPrice(payment.amount)} - {payment.scheduled_at ? formatScheduledDate(payment.scheduled_at) : 'À planifier'}
                                    </div>
                                  ))
                                }
                              </div>
                            )}
                          </div>
                        )}
                        {/* Failed payments in red */}
                        {order.failed_payments_count !== undefined && order.failed_payments_count > 0 && (
                          <div className="relative group">
                            <span className="text-xs text-red-600 font-medium cursor-help">
                              {order.failed_payments_count} échouée(s)
                            </span>
                            {/* Tooltip with failed payment details */}
                            {order.payments && order.payments.filter(p => p.status === 'failed').length > 0 && (
                              <div className="absolute z-10 invisible group-hover:visible bg-red-800 text-white text-xs rounded p-2 -top-2 left-full ml-2 whitespace-nowrap">
                                {order.payments
                                  .filter(p => p.status === 'failed')
                                  .map((payment, idx) => (
                                    <div key={idx}>
                                      {formatPrice(payment.amount)} - Échéance {payment.installment_number}
                                      {payment.error_message && <div className="text-red-200 text-[10px]">{payment.error_message}</div>}
                                    </div>
                                  ))
                                }
                              </div>
                            )}
                          </div>
                        )}
                        {/* If no payments info */}
                        {(order.successful_payments_count === 0 || order.successful_payments_count === undefined) &&
                         (order.pending_payments_count === 0 || order.pending_payments_count === undefined) &&
                         (order.failed_payments_count === 0 || order.failed_payments_count === undefined) && (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80 text-sm font-medium transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Voir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 p-4 border-t">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Précédent
            </Button>
            <span className="text-sm text-gray-600">
              Page {currentPage} sur {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Suivant
            </Button>
          </div>
        )}
      </Card>

      {/* Add Manual Order Modal */}
      {showAddModal && (
        <AddManualOrderModal
          programs={programs}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadData();
          }}
        />
      )}

      {/* Order Detail Modal with Payment Timeline */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}

// Modal Component for Manual Order
interface AddManualOrderModalProps {
  programs: Program[];
  onClose: () => void;
  onSuccess: () => void;
}

function AddManualOrderModal({ programs, onClose, onSuccess }: AddManualOrderModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [classes, setClasses] = useState<ClassModel[]>([]);

  const [formData, setFormData] = useState({
    program_id: '',
    class_id: '',
    customer_first_name: '',
    customer_last_name: '',
    customer_email: '',
    customer_phone: '',
    customer_gender: '' as 'male' | 'female' | '',
    payment_method: 'free' as 'free' | 'cash' | 'transfer',
    custom_amount: '',
    notes: '',
  });

  // Get selected program price
  const selectedProgram = formData.program_id ? programs.find(p => p.id === parseInt(formData.program_id)) : null;
  const programPrice = selectedProgram ? Number(selectedProgram.price) : 0;

  // Load classes when program changes
  useEffect(() => {
    const loadClasses = async () => {
      if (formData.program_id) {
        try {
          const classesResponse = await classesApi.getAll();
          const allClasses = classesResponse.data || [];
          const programClasses = allClasses.filter(
            (c) => c.program_id === parseInt(formData.program_id)
          );
          setClasses(programClasses);

          // Auto-select default class if available
          const selectedProgram = programs.find(p => p.id === parseInt(formData.program_id));
          if (selectedProgram?.default_class_id) {
            setFormData(prev => ({ ...prev, class_id: selectedProgram.default_class_id!.toString() }));
          } else {
            setFormData(prev => ({ ...prev, class_id: '' }));
          }
        } catch (err) {
          console.error('Error loading classes:', err);
        }
      } else {
        setClasses([]);
      }
    };
    loadClasses();
  }, [formData.program_id, programs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.program_id || !formData.class_id || !formData.customer_first_name || !formData.customer_last_name || !formData.customer_email || !formData.customer_gender) {
      setError('Veuillez remplir tous les champs obligatoires (programme, classe, prénom, nom, email, genre).');
      return;
    }

    setIsSubmitting(true);
    try {
      await ordersApi.createManual({
        program_id: parseInt(formData.program_id),
        class_id: formData.class_id ? parseInt(formData.class_id) : undefined,
        customer_first_name: formData.customer_first_name,
        customer_last_name: formData.customer_last_name,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone || undefined,
        customer_gender: formData.customer_gender as 'male' | 'female',
        payment_method: formData.payment_method,
        custom_amount: formData.payment_method !== 'free' && formData.custom_amount ? parseFloat(formData.custom_amount) : undefined,
        admin_notes: formData.notes || undefined,
      });
      onSuccess();
    } catch (err: any) {
      console.error('Error creating manual order:', err);
      setError(err.response?.data?.message || 'Erreur lors de la création de la commande.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="font-playfair text-2xl font-semibold text-secondary">
              Ajout manuel
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Créez une inscription manuelle. Un compte élève sera automatiquement créé.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-error/10 border border-error rounded-lg">
              <p className="text-error text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Programme *
            </label>
            <select
              name="program_id"
              value={formData.program_id}
              onChange={handleChange}
              className="input w-full"
              required
            >
              <option value="">Sélectionner un programme</option>
              {programs.filter(p => p.active).map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name} - {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(program.price)}
                </option>
              ))}
            </select>
          </div>

          {classes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Classe
              </label>
              <select
                name="class_id"
                value={formData.class_id}
                onChange={handleChange}
                className="input w-full"
              >
                <option value="">Aucune classe</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.academic_year})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Prénom *"
              name="customer_first_name"
              value={formData.customer_first_name}
              onChange={handleChange}
              required
            />
            <Input
              label="Nom *"
              name="customer_last_name"
              value={formData.customer_last_name}
              onChange={handleChange}
              required
            />
          </div>

          <Input
            label="Email *"
            type="email"
            name="customer_email"
            value={formData.customer_email}
            onChange={handleChange}
            required
          />

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Genre *
            </label>
            <select
              name="customer_gender"
              value={formData.customer_gender}
              onChange={handleChange}
              className="input w-full"
              required
            >
              <option value="">Sélectionner le genre</option>
              <option value="male">Homme</option>
              <option value="female">Femme</option>
            </select>
          </div>

          <Input
            label="Téléphone"
            type="tel"
            name="customer_phone"
            value={formData.customer_phone}
            onChange={handleChange}
          />

          {/* Méthode de paiement */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Mode de paiement *
            </label>
            <select
              name="payment_method"
              value={formData.payment_method}
              onChange={handleChange}
              className="input w-full"
              required
            >
              <option value="free">Gratuit</option>
              <option value="cash">Espèces</option>
              <option value="transfer">Virement</option>
            </select>
          </div>

          {/* Montant personnalisé (seulement si pas gratuit) */}
          {formData.payment_method !== 'free' && (
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Montant
              </label>
              <div className="relative">
                <Input
                  type="number"
                  name="custom_amount"
                  value={formData.custom_amount}
                  onChange={handleChange}
                  placeholder={programPrice.toString()}
                  min="0"
                  step="0.01"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Prix du programme : {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(programPrice)}
                {formData.custom_amount && parseFloat(formData.custom_amount) !== programPrice && (
                  <span className="text-amber-600 ml-1">
                    (montant personnalisé)
                  </span>
                )}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="input w-full"
              placeholder="Notes internes (optionnel)..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting} isLoading={isSubmitting}>
              Créer l'inscription
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Order Detail Modal with Payment Timeline
interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
}

const paymentStatusColors: Record<string, string> = {
  succeeded: 'bg-green-500',
  scheduled: 'bg-blue-500',
  failed: 'bg-red-500',
  refunded: 'bg-gray-500',
  recovered: 'bg-amber-500', // Failed but recovered
};

const paymentStatusLabels: Record<string, string> = {
  succeeded: 'Payé',
  scheduled: 'Planifié',
  failed: 'Échoué',
  refunded: 'Remboursé',
  recovered: 'Régularisé',
};

function OrderDetailModal({ order, onClose }: OrderDetailModalProps) {
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const payments = order.payments || [];
  // Filtrer pour n'afficher que les paiements originaux (pas les régularisations)
  // Les régularisations seront affichées en sous-élément du paiement échoué
  const originalPayments = payments.filter(p => !p.is_recovery_payment);
  const sortedPayments = [...originalPayments].sort((a, b) => a.installment_number - b.installment_number);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-playfair text-2xl font-semibold text-secondary">
                Commande #{order.id}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {order.customer_first_name} {order.customer_last_name}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Order Summary */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-500">Programme</p>
              <p className="font-medium text-secondary">{order.program?.name}</p>
              {order.class && <p className="text-xs text-gray-500">{order.class.name}</p>}
            </div>
            <div>
              <p className="text-sm text-gray-500">Montant total</p>
              <p className="font-bold text-lg text-secondary">{formatPrice(order.total_amount)}</p>
              {order.installments_count > 1 && (
                <p className="text-xs text-gray-500">
                  en {order.installments_count} fois
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Statut</p>
              <StatusBadge status={order.status} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Mode</p>
              <div className="flex items-center gap-2">
                <PaymentMethodIcon method={order.payment_method} />
                {order.stripe_subscription_id && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                    Abonnement
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Notes admin */}
          {order.admin_notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-amber-800">Note admin</p>
                  <p className="text-sm text-amber-700 mt-1 whitespace-pre-wrap">{order.admin_notes}</p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Timeline */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-secondary mb-4">Timeline des paiements</h3>

            {sortedPayments.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun paiement enregistré</p>
            ) : (
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-gray-200"></div>

                <div className="space-y-4">
                  {sortedPayments.map((payment) => {
                    // Vérifier si le paiement échoué a été régularisé
                    const isRecovered = payment.status === 'failed' && payment.recovery_payment?.status === 'succeeded';
                    const displayStatus = isRecovered ? 'recovered' : payment.status;

                    return (
                      <div key={payment.id} className="relative pl-8">
                        {/* Dot */}
                        <div
                          className={`absolute left-0 top-1.5 w-6 h-6 rounded-full ${paymentStatusColors[displayStatus]} flex items-center justify-center`}
                        >
                          {payment.status === 'succeeded' ? (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : isRecovered ? (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          ) : payment.status === 'failed' ? (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          ) : (
                            <span className="text-white text-xs font-bold">{payment.installment_number}</span>
                          )}
                        </div>

                        {/* Content */}
                        <div className={`rounded-lg p-4 ${isRecovered ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-secondary">
                              Paiement {payment.installment_number}/{order.installments_count}
                            </span>
                            <span className="font-bold text-secondary">{formatPrice(payment.amount)}</span>
                          </div>

                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                isRecovered
                                  ? 'bg-amber-100 text-amber-700'
                                  : payment.status === 'succeeded'
                                  ? 'bg-green-100 text-green-700'
                                  : payment.status === 'failed'
                                  ? 'bg-red-100 text-red-700'
                                  : payment.status === 'scheduled'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {paymentStatusLabels[displayStatus]}
                            </span>
                            {isRecovered && (
                              <span className="text-xs text-gray-500">(après échec)</span>
                            )}
                          </div>

                          {/* Dates and details */}
                          <div className="text-xs text-gray-500 space-y-1">
                            {/* Pour les paiements réussis directement */}
                            {payment.status === 'succeeded' && payment.paid_at && (
                              <p>
                                Payé le {format(new Date(payment.paid_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                              </p>
                            )}

                            {/* Pour les paiements planifiés */}
                            {payment.scheduled_at && payment.status === 'scheduled' && (
                              <p>
                                Prévu le {format(new Date(payment.scheduled_at), 'd MMMM yyyy', { locale: fr })}
                              </p>
                            )}

                            {/* Pour les paiements échoués (régularisés ou non) */}
                            {payment.status === 'failed' && (
                              <>
                                {payment.error_message && (
                                  <p className="text-red-600">
                                    Erreur initiale : {payment.error_message}
                                  </p>
                                )}
                                {payment.last_attempt_at && (
                                  <p>
                                    Échec le {format(new Date(payment.last_attempt_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                                  </p>
                                )}

                                {/* Afficher les infos de régularisation si présentes */}
                                {isRecovered && payment.recovery_payment && (
                                  <div className="mt-2 pt-2 border-t border-amber-200">
                                    <p className="text-green-600 font-medium">
                                      ✓ Régularisé le {format(new Date(payment.recovery_payment.paid_at!), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                                    </p>
                                  </div>
                                )}

                                {/* Pour les paiements échoués non régularisés */}
                                {!isRecovered && (
                                  <>
                                    {payment.attempt_count && payment.attempt_count > 1 && (
                                      <p className="text-amber-600">
                                        {payment.attempt_count} tentative(s)
                                      </p>
                                    )}
                                    {payment.next_retry_at && (
                                      <p className="text-blue-600">
                                        Prochaine tentative : {format(new Date(payment.next_retry_at), "d MMM 'à' HH:mm", { locale: fr })}
                                      </p>
                                    )}
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Stripe IDs for debugging */}
          {(order.stripe_subscription_id || order.stripe_checkout_session_id) && (
            <div className="border-t mt-6 pt-4">
              <p className="text-xs text-gray-400 mb-2">Informations Stripe</p>
              <div className="text-xs text-gray-500 space-y-1 font-mono">
                {order.stripe_subscription_id && (
                  <p>Subscription: {order.stripe_subscription_id}</p>
                )}
                {order.stripe_checkout_session_id && (
                  <p>Session: {order.stripe_checkout_session_id}</p>
                )}
                {order.stripe_customer_id && (
                  <p>Customer: {order.stripe_customer_id}</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t">
          <Button variant="outline" onClick={onClose} className="w-full">
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}
