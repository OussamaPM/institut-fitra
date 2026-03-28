<?php

declare(strict_types=1);

namespace App\Services;

use App\Mail\EnrollmentConfirmationMail;
use App\Models\Enrollment;
use App\Models\Notification;
use App\Models\Order;
use App\Models\OrderPayment;
use App\Models\Program;
use App\Models\ProgramLevel;
use App\Models\Setting;
use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Stripe\Checkout\Session as StripeSession;
use Stripe\Exception\ApiErrorException;
use Stripe\Price;
use Stripe\Product;
use Stripe\Stripe;
use Stripe\Subscription;
use Stripe\Webhook;

class StripeService
{
    private ?string $webhookSecret = null;

    public function __construct()
    {
        // Lire la clé Stripe depuis les settings (DB) ou fallback sur config
        $stripeSecret = $this->getSettingValue('stripe_secret_key') ?: config('stripe.secret');
        $this->webhookSecret = $this->getSettingValue('stripe_webhook_secret') ?: config('stripe.webhook_secret');

        Stripe::setApiKey($stripeSecret);
    }

    /**
     * Récupérer une valeur depuis la table settings
     */
    private function getSettingValue(string $key): ?string
    {
        try {
            $setting = Setting::where('key', $key)->first();

            return $setting?->value;
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Créer une session Stripe Checkout pour un programme
     * La commande n'est PAS créée ici - elle sera créée dans le webhook après paiement validé
     * Mode payment si paiement unique, mode subscription si paiement échelonné
     */
    public function createCheckoutSession(
        Program $program,
        string $customerEmail,
        string $customerFirstName,
        string $customerLastName,
        string $customerGender,
        int $installmentsCount = 1
    ): array {
        try {
            // Vérifier la classe par défaut
            if (! $program->default_class_id) {
                throw new \Exception('Ce programme n\'a pas de classe par défaut configurée.');
            }

            // Calculer le montant par paiement
            $totalAmount = (float) $program->price;
            $amountPerInstallment = $totalAmount / $installmentsCount;

            $frontendUrl = config('app.frontend_url', env('FRONTEND_URL'));

            // Mode paiement unique
            if ($installmentsCount === 1) {
                return $this->createSinglePaymentSession($program, $customerEmail, $customerFirstName, $customerLastName, $customerGender, $totalAmount, $frontendUrl);
            }

            // Mode abonnement pour paiements échelonnés
            return $this->createSubscriptionSession($program, $customerEmail, $customerFirstName, $customerLastName, $customerGender, $installmentsCount, $totalAmount, $amountPerInstallment, $frontendUrl);

        } catch (ApiErrorException $e) {
            Log::error('Stripe createCheckoutSession error: '.$e->getMessage());

            return [
                'success' => false,
                'error' => 'Erreur Stripe: '.$e->getMessage(),
            ];
        } catch (\Exception $e) {
            Log::error('createCheckoutSession error: '.$e->getMessage());

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Créer une session Stripe en mode payment (paiement unique)
     * Pas de création de commande ici - sera fait dans le webhook
     */
    private function createSinglePaymentSession(
        Program $program,
        string $customerEmail,
        string $customerFirstName,
        string $customerLastName,
        string $customerGender,
        float $totalAmount,
        string $frontendUrl
    ): array {
        $totalFormatted = number_format($totalAmount, 2, ',', ' ');

        $lineItems = [
            [
                'price_data' => [
                    'currency' => 'eur',
                    'product_data' => [
                        'name' => "Inscription {$program->name}",
                        'description' => "Paiement unique - {$totalFormatted}€",
                    ],
                    'unit_amount' => (int) round($totalAmount * 100),
                ],
                'quantity' => 1,
            ],
        ];

        $sessionParams = [
            'payment_method_types' => ['card'],
            'line_items' => $lineItems,
            'mode' => 'payment',
            'locale' => 'fr',
            'customer_email' => $customerEmail,
            'success_url' => $frontendUrl.'/checkout/success?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => $frontendUrl.'/checkout/cancel',
            'custom_text' => [
                'submit' => [
                    'message' => "Vous serez débité de {$totalFormatted}€ pour votre inscription au programme {$program->name}.",
                ],
            ],
            'metadata' => [
                'program_id' => $program->id,
                'class_id' => $program->default_class_id,
                'customer_email' => $customerEmail,
                'customer_first_name' => $customerFirstName,
                'customer_last_name' => $customerLastName,
                'customer_gender' => $customerGender,
                'total_amount' => $totalAmount,
                'installments_count' => 1,
            ],
        ];

        $checkoutSession = StripeSession::create($sessionParams);

        return [
            'success' => true,
            'checkout_url' => $checkoutSession->url,
            'session_id' => $checkoutSession->id,
        ];
    }

    /**
     * Créer une session Stripe en mode subscription (paiements échelonnés)
     * Pas de création de commande ici - sera fait dans le webhook
     */
    private function createSubscriptionSession(
        Program $program,
        string $customerEmail,
        string $customerFirstName,
        string $customerLastName,
        string $customerGender,
        int $installmentsCount,
        float $totalAmount,
        float $amountPerInstallment,
        string $frontendUrl
    ): array {
        // Formater le montant total pour l'affichage
        $totalFormatted = number_format($totalAmount, 2, ',', ' ');
        $installmentFormatted = number_format($amountPerInstallment, 2, ',', ' ');

        // Créer un produit Stripe pour ce programme avec description claire
        $product = Product::create([
            'name' => "Inscription {$program->name}",
            'description' => "Total : {$totalFormatted}€ en {$installmentsCount} mensualités de {$installmentFormatted}€",
            'metadata' => [
                'program_id' => $program->id,
            ],
        ]);

        // Créer un prix récurrent mensuel
        $price = Price::create([
            'product' => $product->id,
            'unit_amount' => (int) round($amountPerInstallment * 100),
            'currency' => 'eur',
            'recurring' => [
                'interval' => 'month',
                'interval_count' => 1,
            ],
            'metadata' => [
                'program_id' => $program->id,
            ],
        ]);

        $sessionParams = [
            'payment_method_types' => ['card'],
            'line_items' => [
                [
                    'price' => $price->id,
                    'quantity' => 1,
                ],
            ],
            'mode' => 'subscription',
            'locale' => 'fr',
            'customer_email' => $customerEmail,
            'success_url' => $frontendUrl.'/checkout/success?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => $frontendUrl.'/checkout/cancel',
            'subscription_data' => [
                'description' => "Paiement {$installmentsCount}x - {$program->name}",
                'metadata' => [
                    'program_id' => $program->id,
                    'class_id' => $program->default_class_id,
                    'customer_email' => $customerEmail,
                    'customer_first_name' => $customerFirstName,
                    'customer_last_name' => $customerLastName,
                    'customer_gender' => $customerGender,
                    'total_amount' => $totalAmount,
                    'installments_count' => $installmentsCount,
                    'stripe_price_id' => $price->id,
                ],
            ],
            'custom_text' => [
                'submit' => [
                    'message' => "Vous serez débité de {$installmentFormatted}€ aujourd'hui, puis chaque mois pendant {$installmentsCount} mois (total: {$totalFormatted}€). L'abonnement s'arrêtera automatiquement après le dernier paiement.",
                ],
            ],
            'metadata' => [
                'program_id' => $program->id,
                'class_id' => $program->default_class_id,
                'customer_email' => $customerEmail,
                'customer_first_name' => $customerFirstName,
                'customer_last_name' => $customerLastName,
                'customer_gender' => $customerGender,
                'total_amount' => $totalAmount,
                'installments_count' => $installmentsCount,
                'stripe_price_id' => $price->id,
            ],
        ];

        $checkoutSession = StripeSession::create($sessionParams);

        return [
            'success' => true,
            'checkout_url' => $checkoutSession->url,
            'session_id' => $checkoutSession->id,
        ];
    }

    /**
     * Gérer le webhook Stripe
     */
    public function handleWebhook(string $payload, string $signature): array
    {
        try {
            $event = Webhook::constructEvent(
                $payload,
                $signature,
                $this->webhookSecret
            );

            switch ($event->type) {
                // Checkout complété (mode payment OU subscription)
                case 'checkout.session.completed':
                    return $this->handleCheckoutCompleted($event->data->object);

                    // Paiement unique réussi
                case 'payment_intent.succeeded':
                    return $this->handlePaymentSucceeded($event->data->object);

                case 'payment_intent.payment_failed':
                    return $this->handlePaymentFailed($event->data->object);

                    // === WEBHOOKS ABONNEMENT ===

                    // Facture payée (chaque paiement mensuel)
                case 'invoice.paid':
                    return $this->handleInvoicePaid($event->data->object);

                    // Facture en échec
                case 'invoice.payment_failed':
                    return $this->handleInvoicePaymentFailed($event->data->object);

                    // Facture nécessite une action (authentification 3D Secure)
                case 'invoice.payment_action_required':
                    return $this->handleInvoiceActionRequired($event->data->object);

                    // Facture marquée comme non recouvrable
                case 'invoice.marked_uncollectible':
                    return $this->handleInvoiceUncollectible($event->data->object);

                    // Abonnement annulé
                case 'customer.subscription.deleted':
                    return $this->handleSubscriptionCancelled($event->data->object);

                default:
                    Log::info("Stripe webhook non géré: {$event->type}");

                    return ['success' => true, 'message' => 'Webhook reçu mais non traité'];
            }

        } catch (\UnexpectedValueException $e) {
            Log::error('Stripe webhook payload invalide: '.$e->getMessage());

            return ['success' => false, 'error' => 'Payload invalide'];
        } catch (\Stripe\Exception\SignatureVerificationException $e) {
            Log::error('Stripe webhook signature invalide: '.$e->getMessage());

            return ['success' => false, 'error' => 'Signature invalide'];
        } catch (\Exception $e) {
            Log::error('Stripe webhook error: '.$e->getMessage());

            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Traiter un checkout complété
     * C'est ici que la commande est créée (après paiement validé)
     */
    private function handleCheckoutCompleted($session): array
    {
        $metadata = $session->metadata;

        // Vérifier si c'est un paiement de régularisation
        $isRecoveryPayment = ($metadata->is_recovery_payment ?? 'false') === 'true';
        if ($isRecoveryPayment) {
            return $this->handleRecoveryPaymentCompleted($session);
        }

        // Vérifier les données requises
        $programId = $metadata->program_id ?? null;
        $classId = $metadata->class_id ?? null;
        $customerEmail = $metadata->customer_email ?? $session->customer_details->email ?? null;

        if (! $programId || ! $customerEmail) {
            Log::error('Checkout completed: données manquantes', [
                'program_id' => $programId,
                'customer_email' => $customerEmail,
            ]);

            return ['success' => false, 'error' => 'Données manquantes dans metadata'];
        }

        // Vérifier si c'est une réinscription
        $isReinscription = ($metadata->is_reinscription ?? 'false') === 'true';
        $levelNumber = (int) ($metadata->level_number ?? 1);
        $programLevelId = $metadata->program_level_id ?? null;
        $studentId = $metadata->student_id ?? null;

        return DB::transaction(function () use ($session, $metadata, $programId, $classId, $customerEmail, $isReinscription, $levelNumber, $programLevelId, $studentId) {
            $totalAmount = (float) ($metadata->total_amount ?? ($session->amount_total / 100));
            $installmentsCount = (int) ($metadata->installments_count ?? 1);

            // Créer la commande
            $orderData = [
                'program_id' => $programId,
                'class_id' => $classId,
                'customer_email' => $customerEmail,
                'customer_first_name' => $metadata->customer_first_name ?? 'Prénom',
                'customer_last_name' => $metadata->customer_last_name ?? 'Nom',
                'total_amount' => $totalAmount,
                'installments_count' => $installmentsCount,
                'payment_method' => 'stripe',
                'status' => $installmentsCount > 1 ? 'partial' : 'paid',
                'stripe_checkout_session_id' => $session->id,
                'stripe_customer_id' => $session->customer,
                'level_number' => $levelNumber,
            ];

            // Ajouter les données spécifiques à la réinscription
            if ($isReinscription && $programLevelId) {
                $orderData['program_level_id'] = $programLevelId;
                $orderData['student_id'] = $studentId;
            }

            $order = Order::create($orderData);

            // Mode abonnement
            if ($session->mode === 'subscription') {
                $order->update([
                    'stripe_subscription_id' => $session->subscription,
                    'stripe_price_id' => $metadata->stripe_price_id ?? null,
                ]);

                // Créer les paiements planifiés
                $amountPerInstallment = $totalAmount / $installmentsCount;
                for ($i = 1; $i <= $installmentsCount; $i++) {
                    $scheduledAt = $i === 1 ? now() : now()->addMonths($i - 1);

                    OrderPayment::create([
                        'order_id' => $order->id,
                        'amount' => round($amountPerInstallment, 2),
                        'installment_number' => $i,
                        'status' => $i === 1 ? 'succeeded' : 'scheduled',
                        'scheduled_at' => $scheduledAt,
                        'paid_at' => $i === 1 ? now() : null,
                    ]);
                }

                $logPrefix = $isReinscription ? 'Reinscription subscription' : 'Subscription';
                Log::info("{$logPrefix} checkout completed - order #{$order->id} créée");

                // Créer le compte utilisateur et l'inscription
                $this->createStudentAndEnrollment($order, $metadata, $isReinscription);

                return ['success' => true, 'message' => 'Abonnement créé avec succès'];
            }

            // Mode paiement unique
            $order->update([
                'stripe_payment_intent_id' => $session->payment_intent,
            ]);

            // Créer le paiement unique comme réussi
            OrderPayment::create([
                'order_id' => $order->id,
                'amount' => $totalAmount,
                'installment_number' => 1,
                'status' => 'succeeded',
                'paid_at' => now(),
                'stripe_payment_intent_id' => $session->payment_intent,
            ]);

            // Créer le compte utilisateur et l'inscription
            $this->createStudentAndEnrollment($order, $metadata, $isReinscription);

            $logPrefix = $isReinscription ? 'Reinscription' : 'Checkout';
            Log::info("{$logPrefix} completed - order #{$order->id} créée (paiement unique)");

            return ['success' => true, 'message' => 'Paiement traité avec succès'];
        });
    }

    /**
     * Créer l'élève et l'inscrire à la classe
     */
    private function createStudentAndEnrollment(Order $order, $metadata, bool $isReinscription = false): void
    {
        // Pour les réinscriptions, l'élève existe déjà (student_id dans la commande)
        if ($isReinscription && $order->student_id) {
            $student = User::find($order->student_id);
            if (! $student) {
                Log::error("Réinscription: élève #{$order->student_id} introuvable");

                return;
            }
        } else {
            // Vérifier si l'utilisateur existe déjà
            $existingUser = User::where('email', $order->customer_email)->first();

            if ($existingUser) {
                $student = $existingUser;
            } else {
                // Créer le compte élève avec mot de passe temporaire
                $temporaryPassword = Str::random(12);

                $firstName = $metadata->customer_first_name ?? $order->customer_first_name ?? 'Prénom';
                $lastName = $metadata->customer_last_name ?? $order->customer_last_name ?? 'Nom';

                $student = User::create([
                    'email' => $order->customer_email,
                    'password' => Hash::make($temporaryPassword),
                    'role' => 'student',
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                ]);

                // Créer le profil étudiant
                StudentProfile::create([
                    'user_id' => $student->id,
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'gender' => $metadata->customer_gender ?? 'male',
                ]);

                // TODO: Envoyer un email avec les identifiants
                Log::info("Nouveau compte créé pour {$order->customer_email} avec mot de passe temporaire");
            }

            // Mettre à jour la commande avec l'ID de l'élève
            $order->update(['student_id' => $student->id]);
        }

        // Créer l'inscription à la classe si pas déjà inscrit
        $existingEnrollment = Enrollment::where('student_id', $student->id)
            ->where('class_id', $order->class_id)
            ->first();

        if (! $existingEnrollment) {
            $enrollment = Enrollment::create([
                'student_id' => $student->id,
                'class_id' => $order->class_id,
                'status' => 'active',
                'enrolled_at' => now(),
            ]);

            $logType = $isReinscription ? 'Réinscription' : 'Inscription';
            Log::info("{$logType} créée pour student #{$student->id} dans class #{$order->class_id}");

            // Envoyer l'email de confirmation d'inscription
            try {
                $enrollment->load('class.program');
                Mail::to($student->email)->send(new EnrollmentConfirmationMail($student, $enrollment));
            } catch (\Exception $e) {
                Log::error('Enrollment confirmation email error (Stripe): '.$e->getMessage());
            }
        }
    }

    /**
     * Traiter un paiement réussi (pour les paiements suivants)
     */
    private function handlePaymentSucceeded($paymentIntent): array
    {
        // Logique pour les paiements échelonnés suivants
        Log::info('Payment intent succeeded: '.$paymentIntent->id);

        return ['success' => true, 'message' => 'Payment intent traité'];
    }

    /**
     * Traiter un paiement échoué
     */
    private function handlePaymentFailed($paymentIntent): array
    {
        $orderId = $paymentIntent->metadata->order_id ?? null;

        if ($orderId) {
            $order = Order::find($orderId);
            if ($order) {
                $order->update(['status' => 'failed']);

                // Marquer le paiement comme échoué
                $payment = $order->payments()
                    ->where('stripe_payment_intent_id', $paymentIntent->id)
                    ->first();

                if ($payment) {
                    $payment->update([
                        'status' => 'failed',
                        'error_message' => $paymentIntent->last_payment_error->message ?? 'Paiement refusé',
                    ]);
                }

                Log::error("Paiement échoué pour order #{$orderId}");
            }
        }

        return ['success' => true, 'message' => 'Échec de paiement traité'];
    }

    /**
     * Traiter une facture payée (paiement mensuel d'abonnement)
     */
    private function handleInvoicePaid($invoice): array
    {
        // Ignorer les factures sans subscription (mode payment)
        if (! $invoice->subscription) {
            return ['success' => true, 'message' => 'Facture hors abonnement ignorée'];
        }

        // Ignorer la première facture (billing_reason = subscription_create)
        // Elle est déjà gérée dans handleCheckoutCompleted qui marque paiement 1 comme succeeded
        if ($invoice->billing_reason === 'subscription_create') {
            Log::info("Invoice paid: première facture ignorée (subscription_create) pour subscription {$invoice->subscription}");

            return ['success' => true, 'message' => 'Première facture, déjà gérée dans checkout'];
        }

        // Trouver la commande par stripe_subscription_id
        $order = Order::where('stripe_subscription_id', $invoice->subscription)->first();
        if (! $order) {
            Log::warning("Invoice paid: commande introuvable pour subscription {$invoice->subscription}");

            return ['success' => true, 'message' => 'Commande introuvable'];
        }

        // Récupérer la subscription pour vérifier les infos
        try {
            $subscription = Subscription::retrieve($invoice->subscription);
        } catch (\Exception $e) {
            Log::error('Erreur récupération subscription: '.$e->getMessage());

            return ['success' => false, 'error' => 'Subscription introuvable'];
        }

        return DB::transaction(function () use ($order, $invoice, $subscription) {
            // Compter combien de paiements réussis on a
            $paidCount = $order->payments()->where('status', 'succeeded')->count();
            $installmentNumber = $paidCount + 1;

            // Trouver le paiement correspondant
            $payment = $order->payments()
                ->where('installment_number', $installmentNumber)
                ->first();

            if ($payment) {
                $payment->update([
                    'status' => 'succeeded',
                    'paid_at' => now(),
                    'stripe_invoice_id' => $invoice->id,
                    'stripe_payment_intent_id' => $invoice->payment_intent,
                    'attempt_count' => $invoice->attempt_count ?? 1,
                    'last_attempt_at' => now(),
                ]);
            }

            // Mettre à jour le statut de la commande
            $newPaidCount = $paidCount + 1;
            if ($newPaidCount >= $order->installments_count) {
                $order->update(['status' => 'paid']);

                // Annuler l'abonnement car tous les paiements sont effectués
                try {
                    $subscription->cancel();
                    Log::info("Abonnement annulé après {$newPaidCount} paiements pour order #{$order->id}");
                } catch (\Exception $e) {
                    Log::error('Erreur annulation subscription: '.$e->getMessage());
                }
            } else {
                $order->update(['status' => 'partial']);
            }

            // Créer une notification pour l'élève
            if ($order->student_id) {
                Notification::create([
                    'user_id' => $order->student_id,
                    'type' => 'payment',
                    'category' => 'payment_success',
                    'title' => 'Paiement réussi',
                    'message' => "Votre paiement {$installmentNumber}/{$order->installments_count} de {$payment->amount}€ a été effectué avec succès.",
                    'action_url' => '/student/profile',
                ]);
            }

            Log::info("Invoice paid: order #{$order->id}, paiement {$installmentNumber}/{$order->installments_count}");

            return ['success' => true, 'message' => 'Facture traitée avec succès'];
        });
    }

    /**
     * Traiter une facture en échec
     */
    private function handleInvoicePaymentFailed($invoice): array
    {
        if (! $invoice->subscription) {
            return ['success' => true, 'message' => 'Facture hors abonnement ignorée'];
        }

        // Trouver la commande par stripe_subscription_id
        $order = Order::where('stripe_subscription_id', $invoice->subscription)->first();
        if (! $order) {
            Log::warning("Invoice payment failed: commande introuvable pour subscription {$invoice->subscription}");

            return ['success' => true, 'message' => 'Commande introuvable'];
        }

        return DB::transaction(function () use ($order, $invoice) {
            // Trouver le paiement planifié
            $payment = $order->payments()
                ->where('status', 'scheduled')
                ->orderBy('installment_number')
                ->first();

            if ($payment) {
                $payment->update([
                    'stripe_invoice_id' => $invoice->id,
                    'attempt_count' => $invoice->attempt_count ?? 1,
                    'last_attempt_at' => now(),
                    'next_retry_at' => $invoice->next_payment_attempt
                        ? \Carbon\Carbon::createFromTimestamp($invoice->next_payment_attempt)
                        : null,
                    'error_message' => $invoice->last_finalization_error->message ?? 'Paiement refusé',
                ]);
            }

            // Créer une notification pour l'élève
            if ($order->student_id) {
                $nextRetry = $invoice->next_payment_attempt
                    ? \Carbon\Carbon::createFromTimestamp($invoice->next_payment_attempt)->format('d/m/Y')
                    : null;

                $message = "Votre paiement de {$payment->amount}€ a échoué.";
                if ($nextRetry) {
                    $message .= " Prochaine tentative le {$nextRetry}.";
                }

                Notification::create([
                    'user_id' => $order->student_id,
                    'type' => 'payment',
                    'category' => 'payment_failed',
                    'title' => 'Échec de paiement',
                    'message' => $message,
                    'action_url' => '/student/profile',
                ]);
            }

            Log::warning("Invoice payment failed: order #{$order->id}, attempt #{$invoice->attempt_count}");

            return ['success' => true, 'message' => 'Échec de facture traité'];
        });
    }

    /**
     * Traiter une facture nécessitant une action (3D Secure)
     */
    private function handleInvoiceActionRequired($invoice): array
    {
        if (! $invoice->subscription) {
            return ['success' => true, 'message' => 'Facture hors abonnement ignorée'];
        }

        // Trouver la commande par stripe_subscription_id
        $order = Order::where('stripe_subscription_id', $invoice->subscription)->first();
        if (! $order) {
            Log::warning("Invoice action required: commande introuvable pour subscription {$invoice->subscription}");

            return ['success' => true, 'message' => 'Commande introuvable'];
        }

        // Créer une notification pour l'élève
        if ($order->student_id) {
            Notification::create([
                'user_id' => $order->student_id,
                'type' => 'payment',
                'category' => 'payment_action_required',
                'title' => 'Action requise pour votre paiement',
                'message' => 'Votre banque demande une authentification supplémentaire. Veuillez compléter la vérification pour valider votre paiement.',
                'action_url' => $invoice->hosted_invoice_url ?? '/student/profile',
            ]);
        }

        Log::info("Invoice action required: order #{$order->id}");

        return ['success' => true, 'message' => 'Action requise notifiée'];
    }

    /**
     * Traiter une facture marquée comme non recouvrable
     */
    private function handleInvoiceUncollectible($invoice): array
    {
        if (! $invoice->subscription) {
            return ['success' => true, 'message' => 'Facture hors abonnement ignorée'];
        }

        // Trouver la commande par stripe_subscription_id
        $order = Order::where('stripe_subscription_id', $invoice->subscription)->first();
        if (! $order) {
            Log::warning("Invoice uncollectible: commande introuvable pour subscription {$invoice->subscription}");

            return ['success' => true, 'message' => 'Commande introuvable'];
        }

        return DB::transaction(function () use ($order, $invoice) {
            // Marquer le paiement comme échoué définitivement
            $payment = $order->payments()
                ->where('status', 'scheduled')
                ->orderBy('installment_number')
                ->first();

            if ($payment) {
                $payment->update([
                    'status' => 'failed',
                    'stripe_invoice_id' => $invoice->id,
                    'error_message' => 'Paiement non recouvrable après plusieurs tentatives',
                ]);
            }

            $order->update(['status' => 'failed']);

            // Notification pour l'élève
            if ($order->student_id) {
                Notification::create([
                    'user_id' => $order->student_id,
                    'type' => 'payment',
                    'category' => 'payment_uncollectible',
                    'title' => 'Paiement définitivement échoué',
                    'message' => 'Votre paiement a échoué après plusieurs tentatives. Veuillez contacter l\'administration.',
                    'action_url' => '/student/profile',
                ]);
            }

            Log::error("Invoice uncollectible: order #{$order->id}");

            return ['success' => true, 'message' => 'Facture non recouvrable traitée'];
        });
    }

    /**
     * Traiter l'annulation d'un abonnement
     */
    private function handleSubscriptionCancelled($subscription): array
    {
        // Trouver la commande par stripe_subscription_id
        $order = Order::where('stripe_subscription_id', $subscription->id)->first();
        if (! $order) {
            Log::info("Subscription cancelled: commande introuvable pour subscription {$subscription->id}");

            return ['success' => true, 'message' => 'Commande introuvable'];
        }

        // Vérifier si tous les paiements sont effectués
        $paidCount = $order->payments()->where('status', 'succeeded')->count();

        if ($paidCount >= $order->installments_count) {
            // Abonnement annulé normalement après tous les paiements
            Log::info("Subscription cancelled (completed): order #{$order->id}");
        } else {
            // Abonnement annulé prématurément
            Log::warning("Subscription cancelled early: order #{$order->id}, {$paidCount}/{$order->installments_count} payments");

            // Notification pour l'admin pourrait être ajoutée ici
        }

        return ['success' => true, 'message' => 'Annulation subscription traitée'];
    }

    /**
     * Vérifier le statut d'une session checkout
     */
    public function getCheckoutSession(string $sessionId): ?array
    {
        try {
            $session = StripeSession::retrieve($sessionId);

            return [
                'id' => $session->id,
                'status' => $session->status,
                'payment_status' => $session->payment_status,
                'customer_email' => $session->customer_details->email ?? null,
                'amount_total' => $session->amount_total / 100,
                'metadata' => $session->metadata,
            ];
        } catch (ApiErrorException $e) {
            Log::error('Stripe getCheckoutSession error: '.$e->getMessage());

            return null;
        }
    }

    /**
     * Créer une session Stripe Checkout pour une réinscription (niveau supérieur)
     * L'élève est déjà authentifié donc on récupère ses infos
     * La commande n'est PAS créée ici - elle sera créée dans le webhook après paiement validé
     */
    public function createReinscriptionCheckoutSession(
        ProgramLevel $level,
        User $student,
        int $installmentsCount = 1,
        ?int $classId = null
    ): array {
        try {
            // Récupérer le profil de l'élève
            $studentProfile = $student->studentProfile;

            // Calculer le montant par paiement
            $totalAmount = (float) $level->price;
            $amountPerInstallment = $totalAmount / $installmentsCount;

            $frontendUrl = config('app.frontend_url', env('FRONTEND_URL', 'http://app.localhost:3000'));

            // Mode paiement unique
            if ($installmentsCount === 1) {
                return $this->createReinscriptionSinglePaymentSession(
                    $level,
                    $student,
                    $studentProfile,
                    $totalAmount,
                    $frontendUrl,
                    $classId
                );
            }

            // Mode abonnement pour paiements échelonnés
            return $this->createReinscriptionSubscriptionSession(
                $level,
                $student,
                $studentProfile,
                $installmentsCount,
                $totalAmount,
                $amountPerInstallment,
                $frontendUrl,
                $classId
            );

        } catch (ApiErrorException $e) {
            Log::error('Stripe createReinscriptionCheckoutSession error: '.$e->getMessage());

            return [
                'success' => false,
                'error' => 'Erreur Stripe: '.$e->getMessage(),
            ];
        } catch (\Exception $e) {
            Log::error('createReinscriptionCheckoutSession error: '.$e->getMessage());

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Créer une session Stripe en mode payment pour réinscription (paiement unique)
     */
    private function createReinscriptionSinglePaymentSession(
        ProgramLevel $level,
        User $student,
        ?StudentProfile $studentProfile,
        float $totalAmount,
        string $frontendUrl,
        ?int $classId = null
    ): array {
        $totalFormatted = number_format($totalAmount, 2, ',', ' ');
        $productName = "{$level->program->name} - {$level->name}";

        $lineItems = [
            [
                'price_data' => [
                    'currency' => 'eur',
                    'product_data' => [
                        'name' => $productName,
                        'description' => "Réinscription - Paiement unique - {$totalFormatted}€",
                    ],
                    'unit_amount' => (int) round($totalAmount * 100),
                ],
                'quantity' => 1,
            ],
        ];

        $sessionParams = [
            'payment_method_types' => ['card'],
            'line_items' => $lineItems,
            'mode' => 'payment',
            'locale' => 'fr',
            'customer_email' => $student->email,
            'success_url' => $frontendUrl.'/student/reinscription/success?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => $frontendUrl.'/student/reinscription/cancel',
            'custom_text' => [
                'submit' => [
                    'message' => "Vous serez débité de {$totalFormatted}€ pour votre réinscription au {$level->name}.",
                ],
            ],
            'metadata' => [
                'program_id' => $level->program_id,
                'class_id' => $classId,
                'program_level_id' => $level->id,
                'level_number' => $level->level_number,
                'student_id' => $student->id,
                'is_reinscription' => 'true',
                'customer_email' => $student->email,
                'customer_first_name' => $studentProfile->first_name ?? $student->first_name,
                'customer_last_name' => $studentProfile->last_name ?? $student->last_name,
                'customer_gender' => $studentProfile->gender ?? 'male',
                'total_amount' => $totalAmount,
                'installments_count' => 1,
            ],
        ];

        $checkoutSession = StripeSession::create($sessionParams);

        return [
            'success' => true,
            'checkout_url' => $checkoutSession->url,
            'session_id' => $checkoutSession->id,
        ];
    }

    /**
     * Créer une session Stripe en mode subscription pour réinscription (paiements échelonnés)
     */
    private function createReinscriptionSubscriptionSession(
        ProgramLevel $level,
        User $student,
        ?StudentProfile $studentProfile,
        int $installmentsCount,
        float $totalAmount,
        float $amountPerInstallment,
        string $frontendUrl,
        ?int $classId = null
    ): array {
        $totalFormatted = number_format($totalAmount, 2, ',', ' ');
        $installmentFormatted = number_format($amountPerInstallment, 2, ',', ' ');
        $productName = "{$level->program->name} - {$level->name}";

        // Créer un produit Stripe pour ce niveau
        $product = Product::create([
            'name' => $productName,
            'description' => "Total : {$totalFormatted}€ en {$installmentsCount} mensualités de {$installmentFormatted}€",
            'metadata' => [
                'program_id' => $level->program_id,
                'program_level_id' => $level->id,
            ],
        ]);

        // Créer un prix récurrent mensuel
        $price = Price::create([
            'product' => $product->id,
            'unit_amount' => (int) round($amountPerInstallment * 100),
            'currency' => 'eur',
            'recurring' => [
                'interval' => 'month',
                'interval_count' => 1,
            ],
            'metadata' => [
                'program_id' => $level->program_id,
                'program_level_id' => $level->id,
            ],
        ]);

        $sessionParams = [
            'payment_method_types' => ['card'],
            'line_items' => [
                [
                    'price' => $price->id,
                    'quantity' => 1,
                ],
            ],
            'mode' => 'subscription',
            'locale' => 'fr',
            'customer_email' => $student->email,
            'success_url' => $frontendUrl.'/student/reinscription/success?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => $frontendUrl.'/student/reinscription/cancel',
            'subscription_data' => [
                'description' => "Réinscription {$installmentsCount}x - {$level->name}",
                'metadata' => [
                    'program_id' => $level->program_id,
                    'class_id' => $classId,
                    'program_level_id' => $level->id,
                    'level_number' => $level->level_number,
                    'student_id' => $student->id,
                    'is_reinscription' => 'true',
                    'customer_email' => $student->email,
                    'customer_first_name' => $studentProfile->first_name ?? $student->first_name,
                    'customer_last_name' => $studentProfile->last_name ?? $student->last_name,
                    'customer_gender' => $studentProfile->gender ?? 'male',
                    'total_amount' => $totalAmount,
                    'installments_count' => $installmentsCount,
                    'stripe_price_id' => $price->id,
                ],
            ],
            'custom_text' => [
                'submit' => [
                    'message' => "Vous serez débité de {$installmentFormatted}€ aujourd'hui, puis chaque mois pendant {$installmentsCount} mois (total: {$totalFormatted}€).",
                ],
            ],
            'metadata' => [
                'program_id' => $level->program_id,
                'class_id' => $classId,
                'program_level_id' => $level->id,
                'level_number' => $level->level_number,
                'student_id' => $student->id,
                'is_reinscription' => 'true',
                'customer_email' => $student->email,
                'customer_first_name' => $studentProfile->first_name ?? $student->first_name,
                'customer_last_name' => $studentProfile->last_name ?? $student->last_name,
                'customer_gender' => $studentProfile->gender ?? 'male',
                'total_amount' => $totalAmount,
                'installments_count' => $installmentsCount,
                'stripe_price_id' => $price->id,
            ],
        ];

        $checkoutSession = StripeSession::create($sessionParams);

        return [
            'success' => true,
            'checkout_url' => $checkoutSession->url,
            'session_id' => $checkoutSession->id,
        ];
    }

    /**
     * Créer une session Stripe Checkout pour régulariser un paiement échoué
     * Ce paiement n'est PAS attaché à l'abonnement original, c'est un paiement unique
     */
    public function createRecoveryPaymentSession(
        OrderPayment $failedPayment,
        Order $order
    ): array {
        try {
            $amount = (float) $failedPayment->amount;
            $amountFormatted = number_format($amount, 2, ',', ' ');

            $frontendUrl = config('app.frontend_url', env('FRONTEND_URL', 'http://app.localhost:3000'));

            // Récupérer le nom du programme/niveau
            $productName = $order->program?->name ?? 'Programme';
            if ($order->program_level_id && $order->programLevel) {
                $productName .= ' - '.$order->programLevel->name;
            }

            $lineItems = [
                [
                    'price_data' => [
                        'currency' => 'eur',
                        'product_data' => [
                            'name' => "Régularisation - {$productName}",
                            'description' => "Paiement {$failedPayment->installment_number}/{$order->installments_count} - {$amountFormatted}€",
                        ],
                        'unit_amount' => (int) round($amount * 100),
                    ],
                    'quantity' => 1,
                ],
            ];

            $sessionParams = [
                'payment_method_types' => ['card'],
                'line_items' => $lineItems,
                'mode' => 'payment',
                'locale' => 'fr',
                'customer_email' => $order->customer_email,
                'success_url' => $frontendUrl.'/student/payment-recovery/success?session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => $frontendUrl.'/student/payment-recovery/cancel',
                'custom_text' => [
                    'submit' => [
                        'message' => "Vous allez régulariser votre échéance {$failedPayment->installment_number}/{$order->installments_count} de {$amountFormatted}€.",
                    ],
                ],
                'metadata' => [
                    'order_id' => $order->id,
                    'order_payment_id' => $failedPayment->id,
                    'is_recovery_payment' => 'true',
                    'student_id' => $order->student_id,
                    'installment_number' => $failedPayment->installment_number,
                    'amount' => $amount,
                ],
            ];

            $checkoutSession = StripeSession::create($sessionParams);

            return [
                'success' => true,
                'checkout_url' => $checkoutSession->url,
                'session_id' => $checkoutSession->id,
            ];

        } catch (ApiErrorException $e) {
            Log::error('Stripe createRecoveryPaymentSession error: '.$e->getMessage());

            return [
                'success' => false,
                'error' => 'Erreur Stripe: '.$e->getMessage(),
            ];
        } catch (\Exception $e) {
            Log::error('createRecoveryPaymentSession error: '.$e->getMessage());

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Traiter le checkout d'un paiement de régularisation
     * IMPORTANT: On ne modifie PAS le paiement échoué original.
     * On crée un NOUVEAU paiement de régularisation lié à l'original.
     * Cela permet de conserver l'historique complet (échec + régularisation).
     */
    public function handleRecoveryPaymentCompleted($session): array
    {
        $metadata = $session->metadata;

        $orderPaymentId = $metadata->order_payment_id ?? null;
        $orderId = $metadata->order_id ?? null;

        if (! $orderPaymentId || ! $orderId) {
            Log::error('Recovery payment: données manquantes', [
                'order_payment_id' => $orderPaymentId,
                'order_id' => $orderId,
            ]);

            return ['success' => false, 'error' => 'Données manquantes dans metadata'];
        }

        return DB::transaction(function () use ($session, $orderPaymentId, $orderId) {
            $failedPayment = OrderPayment::find($orderPaymentId);
            $order = Order::find($orderId);

            if (! $failedPayment || ! $order) {
                Log::error('Recovery payment: paiement ou commande introuvable');

                return ['success' => false, 'error' => 'Paiement ou commande introuvable'];
            }

            // Créer un NOUVEAU paiement de régularisation lié au paiement échoué
            // Le paiement original reste avec status='failed' pour garder l'historique
            $recoveryPayment = OrderPayment::create([
                'order_id' => $order->id,
                'amount' => $failedPayment->amount,
                'installment_number' => $failedPayment->installment_number,
                'status' => 'succeeded',
                'scheduled_at' => now(),
                'paid_at' => now(),
                'stripe_payment_intent_id' => $session->payment_intent,
                'recovery_for_payment_id' => $failedPayment->id,
                'is_recovery_payment' => true,
            ]);

            // Vérifier si tous les paiements originaux sont maintenant couverts
            // Un paiement est "couvert" s'il est réussi OU s'il a un paiement de régularisation réussi
            $coveredPayments = $order->payments()
                ->where('is_recovery_payment', false)
                ->where(function ($query) {
                    $query->where('status', 'succeeded')
                        ->orWhereHas('recoveryPayment', function ($q) {
                            $q->where('status', 'succeeded');
                        });
                })
                ->count();

            $totalOriginalPayments = $order->payments()
                ->where('is_recovery_payment', false)
                ->count();

            $uncoveredFailedPayments = $order->payments()
                ->where('is_recovery_payment', false)
                ->where('status', 'failed')
                ->whereDoesntHave('recoveryPayment', function ($q) {
                    $q->where('status', 'succeeded');
                })
                ->count();

            if ($uncoveredFailedPayments === 0 && $coveredPayments >= $order->installments_count) {
                $order->update(['status' => 'paid']);
            } elseif ($uncoveredFailedPayments === 0) {
                $order->update(['status' => 'partial']);
            }
            // Si encore des paiements échoués non régularisés, on laisse le statut 'failed'

            // Créer une notification pour l'élève
            if ($order->student_id) {
                Notification::create([
                    'user_id' => $order->student_id,
                    'type' => 'payment',
                    'category' => 'payment_recovery_success',
                    'title' => 'Régularisation réussie',
                    'message' => "Votre paiement {$failedPayment->installment_number}/{$order->installments_count} de {$failedPayment->amount}€ a été régularisé avec succès.",
                    'action_url' => '/student/profile',
                ]);
            }

            Log::info("Recovery payment completed: order #{$order->id}, failed payment #{$failedPayment->id}, recovery payment #{$recoveryPayment->id}");

            return ['success' => true, 'message' => 'Régularisation traitée avec succès'];
        });
    }

    /**
     * Créer une session Stripe Customer Portal
     * Permet à l'élève de gérer sa carte bancaire et voir ses paiements
     *
     * TODO: NON TESTÉ — nécessite accès Stripe Dashboard pour activer le Customer Portal
     * (Settings → Billing → Customer portal → Activer)
     */
    public function createPortalSession(string $customerId, string $returnUrl): array
    {
        try {
            $session = \Stripe\BillingPortal\Session::create([
                'customer' => $customerId,
                'return_url' => $returnUrl,
            ]);

            return [
                'success' => true,
                'portal_url' => $session->url,
            ];
        } catch (ApiErrorException $e) {
            Log::error('Stripe createPortalSession error: '.$e->getMessage());

            return [
                'success' => false,
                'error' => 'Erreur Stripe: '.$e->getMessage(),
            ];
        }
    }
}
