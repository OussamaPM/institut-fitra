<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderPayment;
use App\Models\Program;
use App\Models\ProgramLevel;
use App\Services\ProgramLevelService;
use App\Services\StripeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CheckoutController extends Controller
{
    public function __construct(
        private StripeService $stripeService,
        private ProgramLevelService $levelService
    ) {}

    /**
     * Créer une session de checkout Stripe
     */
    public function createCheckoutSession(Request $request): JsonResponse
    {
        $request->validate([
            'program_id' => 'required|exists:programs,id',
            'customer_email' => 'required|email',
            'customer_first_name' => 'required|string|max:255',
            'customer_last_name' => 'required|string|max:255',
            'customer_gender' => 'required|in:male,female',
            'installments_count' => 'sometimes|integer|min:1|max:12',
        ]);

        try {
            $program = Program::with('defaultClass')->findOrFail($request->program_id);

            // Vérifier que le programme a une classe par défaut
            if (! $program->default_class_id) {
                return response()->json([
                    'message' => 'Ce programme n\'accepte pas les inscriptions pour le moment.',
                ], 422);
            }

            // Vérifier le nombre de paiements autorisés
            $installmentsCount = (int) ($request->installments_count ?? 1);
            if ($installmentsCount > $program->max_installments) {
                return response()->json([
                    'message' => "Le nombre maximum de paiements pour ce programme est de {$program->max_installments}.",
                ], 422);
            }

            $result = $this->stripeService->createCheckoutSession(
                program: $program,
                customerEmail: $request->customer_email,
                customerFirstName: $request->customer_first_name,
                customerLastName: $request->customer_last_name,
                customerGender: $request->customer_gender,
                installmentsCount: $installmentsCount
            );

            if (! $result['success']) {
                return response()->json([
                    'message' => $result['error'] ?? 'Erreur lors de la création du paiement.',
                ], 500);
            }

            return response()->json([
                'checkout_url' => $result['checkout_url'],
                'session_id' => $result['session_id'],
            ], 200);

        } catch (\Exception $e) {
            Log::error('createCheckoutSession error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la création de la session de paiement.',
            ], 500);
        }
    }

    /**
     * Webhook Stripe
     */
    public function handleWebhook(Request $request): JsonResponse
    {
        $payload = $request->getContent();
        $signature = $request->header('Stripe-Signature');

        if (! $signature) {
            return response()->json(['error' => 'Signature manquante'], 400);
        }

        $result = $this->stripeService->handleWebhook($payload, $signature);

        if (! $result['success']) {
            return response()->json(['error' => $result['error']], 400);
        }

        return response()->json(['received' => true], 200);
    }

    /**
     * Vérifier le statut d'une session checkout
     */
    public function getCheckoutStatus(Request $request): JsonResponse
    {
        $request->validate([
            'session_id' => 'required|string',
        ]);

        $session = $this->stripeService->getCheckoutSession($request->session_id);

        if (! $session) {
            return response()->json([
                'message' => 'Session introuvable.',
            ], 404);
        }

        // Récupérer la commande associée
        $order = Order::where('stripe_checkout_session_id', $request->session_id)
            ->with(['program', 'class'])
            ->first();

        return response()->json([
            'session' => $session,
            'order' => $order,
        ], 200);
    }

    /**
     * Créer une session de checkout pour une réinscription (niveau supérieur)
     * L'élève doit être authentifié
     */
    public function createReinscriptionSession(Request $request): JsonResponse
    {
        $request->validate([
            'program_level_id' => 'required|exists:program_levels,id',
            'installments_count' => 'sometimes|integer|min:1|max:12',
            'class_id' => 'sometimes|nullable|integer|exists:classes,id',
        ]);

        try {
            $student = $request->user();
            $level = ProgramLevel::with(['program', 'activations.class'])->findOrFail($request->program_level_id);

            // Vérifier que l'élève peut s'inscrire à ce niveau
            if (! $this->levelService->canStudentEnrollToLevel($student->id, $level)) {
                return response()->json([
                    'message' => 'Vous ne pouvez pas vous inscrire à ce niveau.',
                ], 422);
            }

            // Déterminer la classe destination
            $classId = $request->input('class_id');
            if (! $classId) {
                // Prendre l'activation la plus récente
                $latestActivation = $level->activations->sortByDesc('activated_at')->first();
                if (! $latestActivation) {
                    return response()->json([
                        'message' => 'Ce niveau n\'accepte pas les inscriptions pour le moment.',
                    ], 422);
                }
                $classId = $latestActivation->class_id;
            }

            // Vérifier le nombre de paiements autorisés
            $installmentsCount = $request->installments_count ?? 1;
            if ($installmentsCount > $level->max_installments) {
                return response()->json([
                    'message' => "Le nombre maximum de paiements pour ce niveau est de {$level->max_installments}.",
                ], 422);
            }

            $result = $this->stripeService->createReinscriptionCheckoutSession(
                level: $level,
                student: $student,
                installmentsCount: $installmentsCount,
                classId: $classId
            );

            if (! $result['success']) {
                return response()->json([
                    'message' => $result['error'] ?? 'Erreur lors de la création du paiement.',
                ], 500);
            }

            return response()->json([
                'checkout_url' => $result['checkout_url'],
                'session_id' => $result['session_id'],
            ], 200);

        } catch (\Exception $e) {
            Log::error('createReinscriptionSession error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la création de la session de paiement.',
            ], 500);
        }
    }

    /**
     * Récupérer les paiements échoués de l'élève connecté (non encore régularisés)
     */
    public function getFailedPayments(Request $request): JsonResponse
    {
        try {
            $student = $request->user();

            // Récupérer toutes les commandes de l'élève avec paiements échoués NON régularisés
            $orders = Order::where('student_id', $student->id)
                ->whereHas('payments', function ($query) {
                    // Paiements échoués qui n'ont PAS de paiement de régularisation réussi
                    $query->where('status', 'failed')
                        ->where('is_recovery_payment', false)
                        ->whereDoesntHave('recoveryPayment', function ($q) {
                            $q->where('status', 'succeeded');
                        });
                })
                ->with([
                    'program',
                    'programLevel',
                    'payments' => function ($query) {
                        // Paiements échoués non régularisés
                        $query->where('status', 'failed')
                            ->where('is_recovery_payment', false)
                            ->whereDoesntHave('recoveryPayment', function ($q) {
                                $q->where('status', 'succeeded');
                            })
                            ->orderBy('installment_number');
                    },
                ])
                ->get();

            // Transformer les données pour le frontend
            $failedPayments = [];
            foreach ($orders as $order) {
                foreach ($order->payments as $payment) {
                    $failedPayments[] = [
                        'id' => $payment->id,
                        'order_id' => $order->id,
                        'program_name' => $order->program?->name ?? 'Programme',
                        'level_name' => $order->programLevel?->name ?? null,
                        'amount' => $payment->amount,
                        'installment_number' => $payment->installment_number,
                        'installments_count' => $order->installments_count,
                        'error_message' => $payment->error_message,
                        'last_attempt_at' => $payment->last_attempt_at,
                        'created_at' => $payment->created_at,
                    ];
                }
            }

            return response()->json([
                'failed_payments' => $failedPayments,
            ], 200);

        } catch (\Exception $e) {
            Log::error('getFailedPayments error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la récupération des paiements échoués.',
            ], 500);
        }
    }

    /**
     * Récupérer l'historique des paiements de l'élève (incluant les régularisations)
     */
    public function getPaymentHistory(Request $request): JsonResponse
    {
        try {
            $student = $request->user();

            // Récupérer toutes les commandes de l'élève avec leurs paiements
            $orders = Order::where('student_id', $student->id)
                ->with([
                    'program',
                    'programLevel',
                    'payments' => function ($query) {
                        $query->with('recoveryPayment')
                            ->orderBy('installment_number')
                            ->orderBy('is_recovery_payment');
                    },
                ])
                ->orderBy('created_at', 'desc')
                ->get();

            // Transformer les données pour le frontend
            $paymentHistory = [];
            foreach ($orders as $order) {
                $orderData = [
                    'id' => $order->id,
                    'program_name' => $order->program?->name ?? 'Programme',
                    'level_name' => $order->programLevel?->name ?? null,
                    'total_amount' => $order->total_amount,
                    'installments_count' => $order->installments_count,
                    'status' => $order->status,
                    'created_at' => $order->created_at,
                    'payments' => [],
                ];

                // Regrouper les paiements par numéro d'échéance
                $paymentsByInstallment = $order->payments
                    ->where('is_recovery_payment', false)
                    ->keyBy('installment_number');

                foreach ($paymentsByInstallment as $installmentNumber => $payment) {
                    $paymentData = [
                        'id' => $payment->id,
                        'installment_number' => $payment->installment_number,
                        'amount' => $payment->amount,
                        'status' => $payment->status,
                        'scheduled_at' => $payment->scheduled_at,
                        'paid_at' => $payment->paid_at,
                        'error_message' => $payment->error_message,
                        'last_attempt_at' => $payment->last_attempt_at,
                        'is_recovered' => false,
                        'recovery_payment' => null,
                    ];

                    // Si le paiement est échoué, vérifier s'il a été régularisé
                    if ($payment->status === 'failed' && $payment->recoveryPayment) {
                        $recovery = $payment->recoveryPayment;
                        $paymentData['is_recovered'] = $recovery->status === 'succeeded';
                        $paymentData['recovery_payment'] = [
                            'id' => $recovery->id,
                            'status' => $recovery->status,
                            'paid_at' => $recovery->paid_at,
                            'amount' => $recovery->amount,
                        ];
                    }

                    $orderData['payments'][] = $paymentData;
                }

                $paymentHistory[] = $orderData;
            }

            return response()->json([
                'payment_history' => $paymentHistory,
            ], 200);

        } catch (\Exception $e) {
            Log::error('getPaymentHistory error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la récupération de l\'historique des paiements.',
            ], 500);
        }
    }

    /**
     * Créer une session de checkout pour régulariser un paiement échoué
     * L'élève doit être authentifié
     */
    public function createRecoverySession(Request $request): JsonResponse
    {
        $request->validate([
            'payment_id' => 'required|exists:order_payments,id',
        ]);

        try {
            $student = $request->user();
            $payment = OrderPayment::with('order.program', 'order.programLevel')->findOrFail($request->payment_id);
            $order = $payment->order;

            // Vérifier que le paiement appartient à l'élève
            if ($order->student_id !== $student->id) {
                return response()->json([
                    'message' => 'Ce paiement ne vous appartient pas.',
                ], 403);
            }

            // Vérifier que le paiement est en échec
            if ($payment->status !== 'failed') {
                return response()->json([
                    'message' => 'Ce paiement n\'est pas en échec.',
                ], 422);
            }

            $result = $this->stripeService->createRecoveryPaymentSession(
                failedPayment: $payment,
                order: $order
            );

            if (! $result['success']) {
                return response()->json([
                    'message' => $result['error'] ?? 'Erreur lors de la création du paiement.',
                ], 500);
            }

            return response()->json([
                'checkout_url' => $result['checkout_url'],
                'session_id' => $result['session_id'],
            ], 200);

        } catch (\Exception $e) {
            Log::error('createRecoverySession error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la création de la session de régularisation.',
            ], 500);
        }
    }

    /**
     * Créer une session Stripe Customer Portal
     * Permet à l'élève de gérer sa carte bancaire
     *
     * TODO: NON TESTÉ — à tester quand accès Stripe disponible
     * Prérequis : activer le Customer Portal dans Stripe Dashboard (Settings → Billing → Customer portal)
     */
    public function createPortalSession(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            $order = Order::where('student_id', $user->id)
                ->whereNotNull('stripe_customer_id')
                ->whereIn('status', ['paid', 'partial'])
                ->latest()
                ->first();

            if (! $order || ! $order->stripe_customer_id) {
                return response()->json([
                    'message' => 'Aucun paiement Stripe trouvé pour votre compte.',
                ], 404);
            }

            $returnUrl = config('app.frontend_url', env('FRONTEND_URL', 'http://app.localhost:3000')).'/student/profile';

            $result = $this->stripeService->createPortalSession(
                customerId: $order->stripe_customer_id,
                returnUrl: $returnUrl
            );

            if (! $result['success']) {
                return response()->json([
                    'message' => $result['error'] ?? 'Erreur lors de la création du portail.',
                ], 500);
            }

            return response()->json([
                'portal_url' => $result['portal_url'],
            ], 200);

        } catch (\Exception $e) {
            Log::error('createPortalSession error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la création du portail Stripe.',
            ], 500);
        }
    }
}
