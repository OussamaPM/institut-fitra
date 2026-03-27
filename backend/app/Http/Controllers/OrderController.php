<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Enrollment;
use App\Models\Order;
use App\Models\OrderPayment;
use App\Models\Program;
use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class OrderController extends Controller
{
    /**
     * Liste des commandes (admin)
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Order::with([
                'student.studentProfile',
                'program',
                'class',
                'payments.recoveryPayment', // Inclure les paiements de régularisation
            ])
                // Calculer paid_amount en une seule requête (somme des paiements réussis)
                ->withSum(['payments as paid_amount' => function ($q) {
                    $q->where('status', 'succeeded');
                }], 'amount')
                // Compter les paiements réussis (originaux uniquement)
                ->withCount(['payments as successful_payments_count' => function ($q) {
                    $q->where('status', 'succeeded')->where('is_recovery_payment', false);
                }])
                // Compter les paiements en attente
                ->withCount(['payments as pending_payments_count' => function ($q) {
                    $q->where('status', 'scheduled')->where('is_recovery_payment', false);
                }])
                // Compter les paiements échoués non régularisés
                ->withCount(['payments as failed_payments_count' => function ($q) {
                    $q->where('status', 'failed')
                        ->where('is_recovery_payment', false)
                        ->whereDoesntHave('recoveryPayment', function ($rq) {
                            $rq->where('status', 'succeeded');
                        });
                }]);

            // Filtres
            if ($request->has('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            if ($request->has('payment_method') && $request->payment_method !== 'all') {
                $query->where('payment_method', $request->payment_method);
            }

            if ($request->has('program_id')) {
                $query->where('program_id', $request->program_id);
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('customer_email', 'like', "%{$search}%")
                        ->orWhere('customer_first_name', 'like', "%{$search}%")
                        ->orWhere('customer_last_name', 'like', "%{$search}%");
                });
            }

            $orders = $query->latest()->paginate($request->get('per_page', 15));

            // Calculer remaining_amount à partir de paid_amount déjà chargé (pas de requête supplémentaire)
            $orders->getCollection()->transform(function ($order) {
                $order->paid_amount = (float) ($order->paid_amount ?? 0);
                $order->remaining_amount = (float) $order->total_amount - $order->paid_amount;

                return $order;
            });

            return response()->json(['orders' => $orders], 200);

        } catch (\Exception $e) {
            Log::error('Orders index error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la récupération des commandes.',
            ], 500);
        }
    }

    /**
     * Détails d'une commande (admin)
     */
    public function show(Order $order): JsonResponse
    {
        try {
            // Recharger avec les agrégats pour éviter N+1
            $order = Order::with([
                'student.studentProfile',
                'program',
                'class',
                'payments' => function ($query) {
                    $query->with('recoveryPayment')->orderBy('installment_number');
                },
            ])
                ->withSum(['payments as paid_amount' => function ($q) {
                    $q->where('status', 'succeeded');
                }], 'amount')
                ->withCount(['payments as successful_payments_count' => function ($q) {
                    $q->where('status', 'succeeded')->where('is_recovery_payment', false);
                }])
                ->withCount(['payments as pending_payments_count' => function ($q) {
                    $q->where('status', 'scheduled')->where('is_recovery_payment', false);
                }])
                ->withCount(['payments as failed_payments_count' => function ($q) {
                    $q->where('status', 'failed')
                        ->where('is_recovery_payment', false)
                        ->whereDoesntHave('recoveryPayment', function ($rq) {
                            $rq->where('status', 'succeeded');
                        });
                }])
                ->findOrFail($order->id);

            $order->paid_amount = (float) ($order->paid_amount ?? 0);
            $order->remaining_amount = (float) $order->total_amount - $order->paid_amount;

            return response()->json(['order' => $order], 200);

        } catch (\Exception $e) {
            Log::error('Order show error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la récupération de la commande.',
            ], 500);
        }
    }

    /**
     * Créer une commande manuelle (mode Free) - Admin
     */
    public function storeManual(Request $request): JsonResponse
    {
        $request->validate([
            'program_id' => 'required|exists:programs,id',
            'customer_email' => 'required|email',
            'customer_first_name' => 'required|string|max:255',
            'customer_last_name' => 'required|string|max:255',
            'customer_gender' => 'required|in:male,female',
            'payment_method' => 'required|in:free,cash,transfer',
            'custom_amount' => 'nullable|numeric|min:0',
            'admin_notes' => 'nullable|string',
        ]);

        try {
            return DB::transaction(function () use ($request) {
                // Récupérer le programme et sa classe par défaut
                $program = Program::with('defaultClass')->findOrFail($request->program_id);

                if (! $program->default_class_id) {
                    return response()->json([
                        'message' => 'Ce programme n\'a pas de classe par défaut configurée.',
                    ], 422);
                }

                // Vérifier si l'email existe déjà
                $existingUser = User::where('email', $request->customer_email)->first();

                if ($existingUser) {
                    // Vérifier si déjà inscrit à cette classe
                    $existingEnrollment = Enrollment::where('student_id', $existingUser->id)
                        ->where('class_id', $program->default_class_id)
                        ->first();

                    if ($existingEnrollment) {
                        return response()->json([
                            'message' => 'Cet élève est déjà inscrit à cette classe.',
                        ], 422);
                    }

                    $student = $existingUser;
                } else {
                    // Créer le compte élève
                    $student = User::create([
                        'email' => $request->customer_email,
                        'password' => Hash::make(Str::random(16)),
                        'role' => 'student',
                        'first_name' => $request->customer_first_name,
                        'last_name' => $request->customer_last_name,
                    ]);

                    // Créer le profil étudiant
                    StudentProfile::create([
                        'user_id' => $student->id,
                        'first_name' => $request->customer_first_name,
                        'last_name' => $request->customer_last_name,
                        'gender' => $request->customer_gender,
                    ]);
                }

                // Déterminer le montant (personnalisé ou prix du programme)
                $paymentMethod = $request->payment_method;
                $amount = $paymentMethod === 'free' ? 0 : ($request->custom_amount ?? $program->price);

                // Créer la commande
                $order = Order::create([
                    'student_id' => $student->id,
                    'program_id' => $program->id,
                    'class_id' => $program->default_class_id,
                    'customer_email' => $request->customer_email,
                    'customer_first_name' => $request->customer_first_name,
                    'customer_last_name' => $request->customer_last_name,
                    'total_amount' => $amount,
                    'installments_count' => 1,
                    'payment_method' => $paymentMethod,
                    'status' => 'paid',
                    'admin_notes' => $request->admin_notes,
                ]);

                // Créer un paiement
                OrderPayment::create([
                    'order_id' => $order->id,
                    'amount' => $amount,
                    'installment_number' => 1,
                    'status' => 'succeeded',
                    'paid_at' => now(),
                ]);

                // Créer l'inscription à la classe
                Enrollment::create([
                    'student_id' => $student->id,
                    'class_id' => $program->default_class_id,
                    'status' => 'active',
                    'enrolled_at' => now(),
                ]);

                $order->load(['student.studentProfile', 'program', 'class', 'payments']);

                return response()->json([
                    'message' => 'Élève ajouté avec succès.',
                    'order' => $order,
                ], 201);
            });

        } catch (\Exception $e) {
            Log::error('Order storeManual error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de l\'ajout de l\'élève.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Mettre à jour une commande (admin)
     */
    public function update(Request $request, Order $order): JsonResponse
    {
        $request->validate([
            'status' => 'sometimes|in:partial,paid,failed,refunded',
            'admin_notes' => 'nullable|string',
        ]);

        try {
            $order->update($request->only(['status', 'admin_notes']));

            $order->load(['student.studentProfile', 'program', 'class', 'payments']);

            return response()->json([
                'message' => 'Commande mise à jour avec succès.',
                'order' => $order,
            ], 200);

        } catch (\Exception $e) {
            Log::error('Order update error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la mise à jour de la commande.',
            ], 500);
        }
    }

    /**
     * Supprimer une commande (admin)
     */
    public function destroy(Order $order): JsonResponse
    {
        try {
            // Ne pas supprimer si des paiements réels ont été effectués
            // Utiliser une requête directe au lieu de l'accesseur pour éviter N+1
            $successfulPaymentsCount = $order->payments()
                ->where('status', 'succeeded')
                ->where('is_recovery_payment', false)
                ->count();

            if ($order->payment_method !== 'free' && $successfulPaymentsCount > 0) {
                return response()->json([
                    'message' => 'Impossible de supprimer une commande avec des paiements effectués.',
                ], 422);
            }

            $order->delete();

            return response()->json([
                'message' => 'Commande supprimée avec succès.',
            ], 200);

        } catch (\Exception $e) {
            Log::error('Order destroy error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la suppression de la commande.',
            ], 500);
        }
    }

    /**
     * Statistiques des commandes (admin dashboard)
     */
    public function stats(): JsonResponse
    {
        try {
            $stats = [
                'total_orders' => Order::count(),
                'paid_orders' => Order::where('status', 'paid')->count(),
                'pending_orders' => Order::where('status', 'partial')->count(),
                'total_revenue' => OrderPayment::where('status', 'succeeded')->sum('amount'),
                'orders_by_payment_method' => [
                    'stripe' => Order::where('payment_method', 'stripe')->count(),
                    'paypal' => Order::where('payment_method', 'paypal')->count(),
                    'free' => Order::where('payment_method', 'free')->count(),
                    'cash' => Order::where('payment_method', 'cash')->count(),
                    'transfer' => Order::where('payment_method', 'transfer')->count(),
                ],
            ];

            return response()->json(['stats' => $stats], 200);

        } catch (\Exception $e) {
            Log::error('Order stats error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la récupération des statistiques.',
            ], 500);
        }
    }
}
