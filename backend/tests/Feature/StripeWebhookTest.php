<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\ClassModel;
use App\Models\Enrollment;
use App\Models\Order;
use App\Models\OrderPayment;
use App\Models\Program;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class StripeWebhookTest extends TestCase
{
    use RefreshDatabase;

    private string $webhookSecret = 'whsec_test_secret_for_phpunit_tests';

    protected function setUp(): void
    {
        parent::setUp();

        Setting::updateOrCreate(['key' => 'stripe_secret_key'], ['value' => 'sk_test_dummy_key']);
        Setting::updateOrCreate(['key' => 'stripe_webhook_secret'], ['value' => $this->webhookSecret]);

        Mail::fake();
    }

    // ─────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────

    private function sign(string $payload): string
    {
        $timestamp = time();
        $signature = hash_hmac('sha256', "{$timestamp}.{$payload}", $this->webhookSecret);

        return "t={$timestamp},v1={$signature}";
    }

    private function webhook(array $event): \Illuminate\Testing\TestResponse
    {
        $payload = json_encode($event);

        return $this->call(
            'POST',
            '/api/stripe/webhook',
            [],
            [],
            [],
            [
                'HTTP_Stripe-Signature' => $this->sign($payload),
                'CONTENT_TYPE'          => 'application/json',
            ],
            $payload
        );
    }

    private function checkoutEvent(array $metadata, string $mode = 'payment', ?string $sessionId = null): array
    {
        return [
            'type' => 'checkout.session.completed',
            'data' => [
                'object' => [
                    'id'               => $sessionId ?? ('cs_test_'.uniqid()),
                    'mode'             => $mode,
                    'status'           => 'complete',
                    'payment_status'   => 'paid',
                    'customer'         => 'cus_test_123',
                    'payment_intent'   => 'pi_test_123',
                    'subscription'     => $mode === 'subscription' ? 'sub_test_123' : null,
                    'amount_total'     => (int) (($metadata['total_amount'] ?? 100) * 100),
                    'customer_details' => ['email' => $metadata['customer_email']],
                    'metadata'         => $metadata,
                ],
            ],
        ];
    }

    private function makeProgram(): array
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher->id, 'price' => 265]);
        $class   = ClassModel::factory()->create(['program_id' => $program->id]);
        $program->update(['default_class_id' => $class->id]);

        return [$program, $class];
    }

    // ─────────────────────────────────────────────────────────────
    // 1. SÉCURITÉ — SIGNATURE
    // ─────────────────────────────────────────────────────────────

    /** @test */
    public function test_webhook_rejected_when_secret_not_configured(): void
    {
        Setting::where('key', 'stripe_webhook_secret')->delete();
        // Force une nouvelle instance du service pour qu'il recharge les settings
        $this->app->forgetInstance(\App\Services\StripeService::class);

        $payload = json_encode(['type' => 'checkout.session.completed', 'data' => ['object' => []]]);

        $response = $this->call(
            'POST',
            '/api/stripe/webhook',
            [],
            [],
            [],
            ['HTTP_Stripe-Signature' => 't=123,v1=fake', 'CONTENT_TYPE' => 'application/json'],
            $payload
        );

        $response->assertStatus(400);
    }

    /** @test */
    public function test_webhook_rejected_with_invalid_signature(): void
    {
        $payload = json_encode(['type' => 'checkout.session.completed', 'data' => ['object' => []]]);

        $response = $this->call(
            'POST',
            '/api/stripe/webhook',
            [],
            [],
            [],
            ['HTTP_Stripe-Signature' => 't='.time().',v1=invalidsignature', 'CONTENT_TYPE' => 'application/json'],
            $payload
        );

        $response->assertStatus(400);
    }

    /** @test */
    public function test_webhook_rejected_without_signature_header(): void
    {
        $payload = json_encode(['type' => 'checkout.session.completed', 'data' => ['object' => []]]);

        $response = $this->call(
            'POST',
            '/api/stripe/webhook',
            [],
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            $payload
        );

        $response->assertStatus(400);
    }

    // ─────────────────────────────────────────────────────────────
    // 2. CHECKOUT — PAIEMENT UNIQUE
    // ─────────────────────────────────────────────────────────────

    /** @test */
    public function test_checkout_single_payment_creates_order_user_enrollment(): void
    {
        [$program, $class] = $this->makeProgram();

        $metadata = [
            'program_id'           => $program->id,
            'class_id'             => $class->id,
            'customer_email'       => 'nouvel.eleve@test.com',
            'customer_first_name'  => 'Ahmed',
            'customer_last_name'   => 'Benali',
            'customer_gender'      => 'male',
            'total_amount'         => 265,
            'installments_count'   => 1,
        ];

        $this->webhook($this->checkoutEvent($metadata))->assertStatus(200);

        // Commande créée avec bon statut
        $order = Order::where('customer_email', 'nouvel.eleve@test.com')->first();
        $this->assertNotNull($order);
        $this->assertEquals('paid', $order->status);
        $this->assertEquals(1, $order->installments_count);

        // Utilisateur élève créé
        $student = User::where('email', 'nouvel.eleve@test.com')->first();
        $this->assertNotNull($student);
        $this->assertEquals('student', $student->role);

        // Inscription active
        $this->assertDatabaseHas('enrollments', [
            'student_id' => $student->id,
            'class_id'   => $class->id,
            'status'     => 'active',
        ]);

        // Paiement unique succeeded
        $this->assertDatabaseHas('order_payments', [
            'order_id'           => $order->id,
            'status'             => 'succeeded',
            'installment_number' => 1,
        ]);

        // Emails envoyés
        Mail::assertSent(\App\Mail\NewAccountCredentialsMail::class);
        Mail::assertSent(\App\Mail\EnrollmentConfirmationMail::class);
    }

    /** @test */
    public function test_checkout_reuses_existing_user_without_creating_account(): void
    {
        [$program, $class] = $this->makeProgram();
        $existingStudent = User::factory()->create(['role' => 'student', 'email' => 'deja.inscrit@test.com']);

        $metadata = [
            'program_id'          => $program->id,
            'class_id'            => $class->id,
            'customer_email'      => 'deja.inscrit@test.com',
            'customer_first_name' => 'Ahmed',
            'customer_last_name'  => 'Test',
            'customer_gender'     => 'male',
            'total_amount'        => 265,
            'installments_count'  => 1,
        ];

        $this->webhook($this->checkoutEvent($metadata))->assertStatus(200);

        // Toujours un seul utilisateur avec cet email
        $this->assertCount(1, User::where('email', 'deja.inscrit@test.com')->get());

        // Pas d'email de création de compte (utilisateur existant)
        Mail::assertNotSent(\App\Mail\NewAccountCredentialsMail::class);

        // Inscription quand même créée
        $this->assertDatabaseHas('enrollments', [
            'student_id' => $existingStudent->id,
            'class_id'   => $class->id,
            'status'     => 'active',
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // 3. IDEMPOTENCE (CRITIQUE)
    // ─────────────────────────────────────────────────────────────

    /** @test */
    public function test_checkout_completed_is_idempotent(): void
    {
        [$program, $class] = $this->makeProgram();

        $sessionId = 'cs_test_idempotence_'.uniqid();
        $metadata  = [
            'program_id'          => $program->id,
            'class_id'            => $class->id,
            'customer_email'      => 'idempotence@test.com',
            'customer_first_name' => 'Test',
            'customer_last_name'  => 'Idempotence',
            'customer_gender'     => 'male',
            'total_amount'        => 265,
            'installments_count'  => 1,
        ];

        $event = $this->checkoutEvent($metadata, 'payment', $sessionId);

        // Même événement envoyé 2 fois (retry Stripe)
        $this->webhook($event)->assertStatus(200);
        $this->webhook($event)->assertStatus(200);

        // Une seule commande créée
        $this->assertCount(1, Order::where('stripe_checkout_session_id', $sessionId)->get());

        // Un seul utilisateur
        $this->assertCount(1, User::where('email', 'idempotence@test.com')->get());

        // Une seule inscription
        $student = User::where('email', 'idempotence@test.com')->first();
        $this->assertCount(1, Enrollment::where('student_id', $student->id)->where('class_id', $class->id)->get());

        // Un seul paiement
        $order = Order::where('stripe_checkout_session_id', $sessionId)->first();
        $this->assertCount(1, OrderPayment::where('order_id', $order->id)->get());
    }

    // ─────────────────────────────────────────────────────────────
    // 4. ABONNEMENT (PAIEMENTS ÉCHELONNÉS)
    // ─────────────────────────────────────────────────────────────

    /** @test */
    public function test_checkout_subscription_creates_scheduled_payments(): void
    {
        [$program, $class] = $this->makeProgram();

        $metadata = [
            'program_id'          => $program->id,
            'class_id'            => $class->id,
            'customer_email'      => 'abonnement@test.com',
            'customer_first_name' => 'Abonne',
            'customer_last_name'  => 'Test',
            'customer_gender'     => 'female',
            'total_amount'        => 265,
            'installments_count'  => 3,
            'stripe_price_id'     => 'price_test_abc',
        ];

        $this->webhook($this->checkoutEvent($metadata, 'subscription'))->assertStatus(200);

        $order = Order::where('customer_email', 'abonnement@test.com')->first();
        $this->assertNotNull($order);
        $this->assertEquals('partial', $order->status);
        $this->assertEquals(3, $order->installments_count);
        $this->assertEquals('sub_test_123', $order->stripe_subscription_id);

        $payments = OrderPayment::where('order_id', $order->id)->orderBy('installment_number')->get();
        $this->assertCount(3, $payments);
        $this->assertEquals('succeeded', $payments[0]->status);  // 1er paiement fait
        $this->assertEquals('scheduled', $payments[1]->status);  // 2ème planifié
        $this->assertEquals('scheduled', $payments[2]->status);  // 3ème planifié
    }

    // ─────────────────────────────────────────────────────────────
    // 5. INVOICE.PAID — PAIEMENTS MENSUELS
    // ─────────────────────────────────────────────────────────────

    /** @test */
    public function test_invoice_paid_skips_subscription_create_billing_reason(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        [$program, $class] = $this->makeProgram();

        $order = Order::factory()->create([
            'student_id'              => $student->id,
            'program_id'              => $program->id,
            'class_id'                => $class->id,
            'status'                  => 'partial',
            'installments_count'      => 3,
            'stripe_subscription_id'  => 'sub_skip_test',
            'payment_method'          => 'stripe',
        ]);

        OrderPayment::create([
            'order_id'           => $order->id,
            'amount'             => 88.33,
            'installment_number' => 1,
            'status'             => 'succeeded',
            'paid_at'            => now(),
            'is_recovery_payment' => false,
        ]);

        $event = [
            'type' => 'invoice.paid',
            'data' => [
                'object' => [
                    'id'                   => 'in_subscription_create',
                    'subscription'         => 'sub_skip_test',
                    'payment_intent'       => 'pi_first',
                    'billing_reason'       => 'subscription_create', // doit être ignoré
                    'attempt_count'        => 1,
                    'next_payment_attempt' => null,
                ],
            ],
        ];

        $this->webhook($event)->assertStatus(200);

        // Toujours 1 seul paiement, pas de doublon
        $this->assertCount(1, OrderPayment::where('order_id', $order->id)->get());
        $order->refresh();
        $this->assertEquals('partial', $order->status);
    }

    /** @test */
    public function test_invoice_paid_is_idempotent(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        [$program, $class] = $this->makeProgram();

        $order = Order::factory()->create([
            'student_id'             => $student->id,
            'program_id'             => $program->id,
            'class_id'               => $class->id,
            'status'                 => 'partial',
            'installments_count'     => 3,
            'stripe_subscription_id' => 'sub_idempotent',
            'payment_method'         => 'stripe',
        ]);

        // Paiement 1 déjà succeeded et lié à l'invoice
        OrderPayment::create([
            'order_id'            => $order->id,
            'amount'              => 88.33,
            'installment_number'  => 1,
            'status'              => 'succeeded',
            'paid_at'             => now()->subMonth(),
            'stripe_invoice_id'   => 'in_already_processed',
            'is_recovery_payment' => false,
        ]);

        // Paiement 2 encore scheduled
        OrderPayment::create([
            'order_id'            => $order->id,
            'amount'              => 88.33,
            'installment_number'  => 2,
            'status'              => 'scheduled',
            'scheduled_at'        => now(),
            'is_recovery_payment' => false,
        ]);

        // Rejouer l'invoice déjà traitée
        $event = [
            'type' => 'invoice.paid',
            'data' => [
                'object' => [
                    'id'                   => 'in_already_processed',
                    'subscription'         => 'sub_idempotent',
                    'payment_intent'       => 'pi_test',
                    'billing_reason'       => 'subscription_cycle',
                    'attempt_count'        => 1,
                    'next_payment_attempt' => null,
                ],
            ],
        ];

        $this->webhook($event)->assertStatus(200);

        // Paiement 2 toujours scheduled (pas mis à jour)
        $payment2 = OrderPayment::where('order_id', $order->id)->where('installment_number', 2)->first();
        $this->assertEquals('scheduled', $payment2->status);

        // Toujours exactement 2 paiements (pas de doublon)
        $this->assertCount(2, OrderPayment::where('order_id', $order->id)->get());

        // Commande toujours partial
        $order->refresh();
        $this->assertEquals('partial', $order->status);
    }

    /** @test */
    public function test_invoice_paid_marks_installment_succeeded(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        [$program, $class] = $this->makeProgram();

        $order = Order::factory()->create([
            'student_id'             => $student->id,
            'program_id'             => $program->id,
            'class_id'               => $class->id,
            'status'                 => 'partial',
            'installments_count'     => 2,
            'stripe_subscription_id' => 'sub_normal_flow',
            'payment_method'         => 'stripe',
        ]);

        // Paiement 1 déjà réussi
        OrderPayment::create([
            'order_id'            => $order->id,
            'amount'              => 132.50,
            'installment_number'  => 1,
            'status'              => 'succeeded',
            'paid_at'             => now()->subMonth(),
            'is_recovery_payment' => false,
        ]);

        // Paiement 2 planifié
        $payment2 = OrderPayment::create([
            'order_id'            => $order->id,
            'amount'              => 132.50,
            'installment_number'  => 2,
            'status'              => 'scheduled',
            'scheduled_at'        => now(),
            'is_recovery_payment' => false,
        ]);

        $event = [
            'type' => 'invoice.paid',
            'data' => [
                'object' => [
                    'id'                   => 'in_second_payment',
                    'subscription'         => 'sub_normal_flow',
                    'payment_intent'       => 'pi_second',
                    'billing_reason'       => 'subscription_cycle',
                    'attempt_count'        => 1,
                    'next_payment_attempt' => null,
                ],
            ],
        ];

        $this->webhook($event)->assertStatus(200);

        // Paiement 2 marqué succeeded
        $payment2->refresh();
        $this->assertEquals('succeeded', $payment2->status);
        $this->assertEquals('in_second_payment', $payment2->stripe_invoice_id);
        $this->assertNotNull($payment2->paid_at);

        // Commande marquée paid (tous les paiements effectués)
        $order->refresh();
        $this->assertEquals('paid', $order->status);

        // Notification créée pour l'élève
        $this->assertDatabaseHas('notifications', [
            'user_id'  => $student->id,
            'type'     => 'payment',
            'category' => 'payment_success',
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // 6. RÉGULARISATION — RECOVERY PAYMENT
    // ─────────────────────────────────────────────────────────────

    /** @test */
    public function test_recovery_payment_marks_order_paid_when_all_covered(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        [$program, $class] = $this->makeProgram();

        $order = Order::factory()->create([
            'student_id'          => $student->id,
            'program_id'          => $program->id,
            'class_id'            => $class->id,
            'status'              => 'failed',
            'installments_count'  => 1,
            'total_amount'        => 100,
            'customer_email'      => $student->email,
            'customer_first_name' => 'Test',
            'customer_last_name'  => 'Recovery',
            'payment_method'      => 'stripe',
        ]);

        $failedPayment = OrderPayment::create([
            'order_id'            => $order->id,
            'amount'              => 100,
            'installment_number'  => 1,
            'status'              => 'failed',
            'scheduled_at'        => now()->subMonth(),
            'is_recovery_payment' => false,
        ]);

        $sessionId = 'cs_test_recovery_'.uniqid();

        $event = [
            'type' => 'checkout.session.completed',
            'data' => [
                'object' => [
                    'id'               => $sessionId,
                    'mode'             => 'payment',
                    'status'           => 'complete',
                    'payment_status'   => 'paid',
                    'customer'         => null,
                    'payment_intent'   => 'pi_recovery_ok',
                    'subscription'     => null,
                    'amount_total'     => 10000,
                    'customer_details' => ['email' => $student->email],
                    'metadata'         => [
                        'is_recovery_payment' => 'true',
                        'order_id'            => $order->id,
                        'order_payment_id'    => $failedPayment->id,
                        'student_id'          => $student->id,
                        'installment_number'  => 1,
                        'amount'              => 100,
                        'customer_email'      => $student->email,
                        'customer_first_name' => 'Test',
                        'customer_last_name'  => 'Recovery',
                    ],
                ],
            ],
        ];

        $this->webhook($event)->assertStatus(200);

        $order->refresh();
        $this->assertEquals('paid', $order->status);

        // Paiement de récupération créé
        $this->assertDatabaseHas('order_payments', [
            'order_id'                => $order->id,
            'is_recovery_payment'     => true,
            'status'                  => 'succeeded',
            'recovery_for_payment_id' => $failedPayment->id,
        ]);

        // Paiement original toujours failed (historique conservé)
        $failedPayment->refresh();
        $this->assertEquals('failed', $failedPayment->status);

        // Notification envoyée
        $this->assertDatabaseHas('notifications', [
            'user_id'  => $student->id,
            'type'     => 'payment',
            'category' => 'payment_recovery_success',
        ]);
    }

    /** @test */
    public function test_recovery_payment_sets_partial_when_other_failures_remain(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        [$program, $class] = $this->makeProgram();

        $order = Order::factory()->create([
            'student_id'          => $student->id,
            'program_id'          => $program->id,
            'class_id'            => $class->id,
            'status'              => 'failed',
            'installments_count'  => 2,
            'total_amount'        => 200,
            'customer_email'      => $student->email,
            'customer_first_name' => 'Test',
            'customer_last_name'  => 'Partial',
            'payment_method'      => 'stripe',
        ]);

        $failedPayment1 = OrderPayment::create([
            'order_id'            => $order->id,
            'amount'              => 100,
            'installment_number'  => 1,
            'status'              => 'failed',
            'scheduled_at'        => now()->subMonths(2),
            'is_recovery_payment' => false,
        ]);

        // 2ème paiement aussi échoué, non régularisé
        OrderPayment::create([
            'order_id'            => $order->id,
            'amount'              => 100,
            'installment_number'  => 2,
            'status'              => 'failed',
            'scheduled_at'        => now()->subMonth(),
            'is_recovery_payment' => false,
        ]);

        // On régularise uniquement le 1er paiement
        $sessionId = 'cs_test_partial_'.uniqid();

        $event = [
            'type' => 'checkout.session.completed',
            'data' => [
                'object' => [
                    'id'               => $sessionId,
                    'mode'             => 'payment',
                    'status'           => 'complete',
                    'payment_status'   => 'paid',
                    'customer'         => null,
                    'payment_intent'   => 'pi_recovery_partial',
                    'subscription'     => null,
                    'amount_total'     => 10000,
                    'customer_details' => ['email' => $student->email],
                    'metadata'         => [
                        'is_recovery_payment' => 'true',
                        'order_id'            => $order->id,
                        'order_payment_id'    => $failedPayment1->id,
                        'student_id'          => $student->id,
                        'installment_number'  => 1,
                        'amount'              => 100,
                        'customer_email'      => $student->email,
                        'customer_first_name' => 'Test',
                        'customer_last_name'  => 'Partial',
                    ],
                ],
            ],
        ];

        $this->webhook($event)->assertStatus(200);

        $order->refresh();
        // 'failed' → 'partial' car au moins un paiement couvert
        $this->assertEquals('partial', $order->status);
    }

    /** @test */
    public function test_recovery_payment_idempotent_on_same_session(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        [$program, $class] = $this->makeProgram();

        $order = Order::factory()->create([
            'student_id'          => $student->id,
            'program_id'          => $program->id,
            'class_id'            => $class->id,
            'status'              => 'failed',
            'installments_count'  => 1,
            'total_amount'        => 100,
            'customer_email'      => $student->email,
            'customer_first_name' => 'Test',
            'customer_last_name'  => 'IdemRecovery',
            'payment_method'      => 'stripe',
        ]);

        $failedPayment = OrderPayment::create([
            'order_id'            => $order->id,
            'amount'              => 100,
            'installment_number'  => 1,
            'status'              => 'failed',
            'is_recovery_payment' => false,
        ]);

        $sessionId = 'cs_test_recovery_idem_'.uniqid();

        $event = [
            'type' => 'checkout.session.completed',
            'data' => [
                'object' => [
                    'id'               => $sessionId,
                    'mode'             => 'payment',
                    'status'           => 'complete',
                    'payment_status'   => 'paid',
                    'customer'         => null,
                    'payment_intent'   => 'pi_recovery_idem',
                    'subscription'     => null,
                    'amount_total'     => 10000,
                    'customer_details' => ['email' => $student->email],
                    'metadata'         => [
                        'is_recovery_payment' => 'true',
                        'order_id'            => $order->id,
                        'order_payment_id'    => $failedPayment->id,
                        'student_id'          => $student->id,
                        'installment_number'  => 1,
                        'amount'              => 100,
                        'customer_email'      => $student->email,
                        'customer_first_name' => 'Test',
                        'customer_last_name'  => 'IdemRecovery',
                    ],
                ],
            ],
        ];

        // Même événement envoyé 2 fois
        $this->webhook($event)->assertStatus(200);
        $this->webhook($event)->assertStatus(200);

        // Un seul paiement de régularisation créé
        $this->assertCount(
            1,
            OrderPayment::where('order_id', $order->id)->where('is_recovery_payment', true)->get()
        );
    }

    // ─────────────────────────────────────────────────────────────
    // 7. INVOICE.PAYMENT_FAILED
    // ─────────────────────────────────────────────────────────────

    /** @test */
    public function test_invoice_payment_failed_updates_payment_and_notifies_student(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        [$program, $class] = $this->makeProgram();

        $order = Order::factory()->create([
            'student_id'             => $student->id,
            'program_id'             => $program->id,
            'class_id'               => $class->id,
            'status'                 => 'partial',
            'installments_count'     => 3,
            'stripe_subscription_id' => 'sub_failed_payment',
            'payment_method'         => 'stripe',
        ]);

        OrderPayment::create([
            'order_id'            => $order->id,
            'amount'              => 88.33,
            'installment_number'  => 1,
            'status'              => 'succeeded',
            'paid_at'             => now()->subMonth(),
            'is_recovery_payment' => false,
        ]);

        $scheduledPayment = OrderPayment::create([
            'order_id'            => $order->id,
            'amount'              => 88.33,
            'installment_number'  => 2,
            'status'              => 'scheduled',
            'scheduled_at'        => now(),
            'is_recovery_payment' => false,
        ]);

        $nextRetry = now()->addDays(3)->timestamp;

        $event = [
            'type' => 'invoice.payment_failed',
            'data' => [
                'object' => [
                    'id'                   => 'in_failed_test',
                    'subscription'         => 'sub_failed_payment',
                    'payment_intent'       => 'pi_failed',
                    'billing_reason'       => 'subscription_cycle',
                    'attempt_count'        => 1,
                    'next_payment_attempt' => $nextRetry,
                    'last_finalization_error' => null,
                ],
            ],
        ];

        $this->webhook($event)->assertStatus(200);

        // Paiement mis à jour avec les infos d'échec
        $scheduledPayment->refresh();
        $this->assertEquals('in_failed_test', $scheduledPayment->stripe_invoice_id);
        $this->assertEquals(1, $scheduledPayment->attempt_count);
        $this->assertNotNull($scheduledPayment->next_retry_at);

        // Notification d'échec envoyée à l'élève
        $this->assertDatabaseHas('notifications', [
            'user_id'  => $student->id,
            'type'     => 'payment',
            'category' => 'payment_failed',
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // 8. INVOICE.PAYMENT_FAILED — idempotence (double webhook)
    // ─────────────────────────────────────────────────────────────

    /** @test */
    public function test_invoice_payment_failed_is_idempotent(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        [$program, $class] = $this->makeProgram();

        $order = Order::factory()->create([
            'student_id'             => $student->id,
            'program_id'             => $program->id,
            'class_id'               => $class->id,
            'status'                 => 'partial',
            'installments_count'     => 2,
            'stripe_subscription_id' => 'sub_idempotent_fail',
            'payment_method'         => 'stripe',
        ]);

        OrderPayment::create([
            'order_id'            => $order->id,
            'amount'              => 100,
            'installment_number'  => 1,
            'status'              => 'succeeded',
            'paid_at'             => now()->subMonth(),
            'is_recovery_payment' => false,
        ]);

        OrderPayment::create([
            'order_id'            => $order->id,
            'amount'              => 100,
            'installment_number'  => 2,
            'status'              => 'scheduled',
            'scheduled_at'        => now(),
            'is_recovery_payment' => false,
        ]);

        $event = [
            'type' => 'invoice.payment_failed',
            'data' => [
                'object' => [
                    'id'                      => 'in_idempotent_fail',
                    'subscription'            => 'sub_idempotent_fail',
                    'payment_intent'          => 'pi_fail',
                    'billing_reason'          => 'subscription_cycle',
                    'attempt_count'           => 1,
                    'next_payment_attempt'    => now()->addDays(3)->timestamp,
                    'last_finalization_error' => null,
                ],
            ],
        ];

        // Même webhook envoyé 2 fois
        $this->webhook($event)->assertStatus(200);
        $this->webhook($event)->assertStatus(200);

        // Une seule notification créée
        $this->assertDatabaseCount('notifications', 1);
    }

    // ─────────────────────────────────────────────────────────────
    // 9. INVOICE.MARKED_UNCOLLECTIBLE — cible le bon paiement
    // ─────────────────────────────────────────────────────────────

    /** @test */
    public function test_invoice_uncollectible_marks_correct_payment_failed(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        [$program, $class] = $this->makeProgram();

        $order = Order::factory()->create([
            'student_id'             => $student->id,
            'program_id'             => $program->id,
            'class_id'               => $class->id,
            'status'                 => 'partial',
            'installments_count'     => 3,
            'stripe_subscription_id' => 'sub_uncollectible',
            'payment_method'         => 'stripe',
        ]);

        OrderPayment::create([
            'order_id'            => $order->id,
            'amount'              => 100,
            'installment_number'  => 1,
            'status'              => 'succeeded',
            'paid_at'             => now()->subMonths(2),
            'is_recovery_payment' => false,
        ]);

        // Paiement 2 déjà marqué avec l'invoice par invoice.payment_failed
        $payment2 = OrderPayment::create([
            'order_id'            => $order->id,
            'amount'              => 100,
            'installment_number'  => 2,
            'status'              => 'scheduled',
            'stripe_invoice_id'   => 'in_uncollectible_inv',
            'scheduled_at'        => now()->subMonth(),
            'is_recovery_payment' => false,
        ]);

        // Paiement 3 — ne doit PAS être touché
        $payment3 = OrderPayment::create([
            'order_id'            => $order->id,
            'amount'              => 100,
            'installment_number'  => 3,
            'status'              => 'scheduled',
            'scheduled_at'        => now(),
            'is_recovery_payment' => false,
        ]);

        $event = [
            'type' => 'invoice.marked_uncollectible',
            'data' => [
                'object' => [
                    'id'           => 'in_uncollectible_inv',
                    'subscription' => 'sub_uncollectible',
                ],
            ],
        ];

        $this->webhook($event)->assertStatus(200);

        // Paiement 2 marqué failed (celui lié à l'invoice)
        $payment2->refresh();
        $this->assertEquals('failed', $payment2->status);

        // Paiement 3 NON touché (toujours scheduled)
        $payment3->refresh();
        $this->assertEquals('scheduled', $payment3->status);

        // Commande marquée failed
        $order->refresh();
        $this->assertEquals('failed', $order->status);
    }

    // ─────────────────────────────────────────────────────────────
    // 10. CUSTOMER.SUBSCRIPTION.DELETED — annulation prématurée
    // ─────────────────────────────────────────────────────────────

    /** @test */
    public function test_subscription_cancelled_early_marks_scheduled_payments_failed(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        [$program, $class] = $this->makeProgram();

        $order = Order::factory()->create([
            'student_id'             => $student->id,
            'program_id'             => $program->id,
            'class_id'               => $class->id,
            'status'                 => 'partial',
            'installments_count'     => 3,
            'stripe_subscription_id' => 'sub_early_cancel',
            'payment_method'         => 'stripe',
        ]);

        OrderPayment::create([
            'order_id'            => $order->id,
            'amount'              => 100,
            'installment_number'  => 1,
            'status'              => 'succeeded',
            'paid_at'             => now()->subMonth(),
            'is_recovery_payment' => false,
        ]);

        $payment2 = OrderPayment::create([
            'order_id'            => $order->id,
            'amount'              => 100,
            'installment_number'  => 2,
            'status'              => 'scheduled',
            'scheduled_at'        => now(),
            'is_recovery_payment' => false,
        ]);

        $payment3 = OrderPayment::create([
            'order_id'            => $order->id,
            'amount'              => 100,
            'installment_number'  => 3,
            'status'              => 'scheduled',
            'scheduled_at'        => now()->addMonth(),
            'is_recovery_payment' => false,
        ]);

        $event = [
            'type' => 'customer.subscription.deleted',
            'data' => [
                'object' => [
                    'id'     => 'sub_early_cancel',
                    'status' => 'canceled',
                ],
            ],
        ];

        $this->webhook($event)->assertStatus(200);

        // Les deux paiements scheduled marqués failed
        $payment2->refresh();
        $this->assertEquals('failed', $payment2->status);
        $payment3->refresh();
        $this->assertEquals('failed', $payment3->status);

        // Commande marquée failed
        $order->refresh();
        $this->assertEquals('failed', $order->status);

        // Notification envoyée
        $this->assertDatabaseHas('notifications', [
            'user_id'  => $student->id,
            'type'     => 'payment',
            'category' => 'payment_uncollectible',
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // 11. INVOICE.PAYMENT_FAILED — null-safe quand aucun paiement scheduled
    // ─────────────────────────────────────────────────────────────

    /** @test */
    public function test_invoice_payment_failed_safe_when_no_scheduled_payment(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        [$program, $class] = $this->makeProgram();

        $order = Order::factory()->create([
            'student_id'             => $student->id,
            'program_id'             => $program->id,
            'class_id'               => $class->id,
            'status'                 => 'paid',
            'installments_count'     => 1,
            'stripe_subscription_id' => 'sub_no_scheduled',
            'payment_method'         => 'stripe',
        ]);

        OrderPayment::create([
            'order_id'            => $order->id,
            'amount'              => 265,
            'installment_number'  => 1,
            'status'              => 'succeeded',
            'paid_at'             => now()->subMonth(),
            'is_recovery_payment' => false,
        ]);

        // Aucun paiement scheduled — ne doit pas planter
        $event = [
            'type' => 'invoice.payment_failed',
            'data' => [
                'object' => [
                    'id'                      => 'in_no_scheduled',
                    'subscription'            => 'sub_no_scheduled',
                    'payment_intent'          => 'pi_no_scheduled',
                    'billing_reason'          => 'subscription_cycle',
                    'attempt_count'           => 1,
                    'next_payment_attempt'    => null,
                    'last_finalization_error' => null,
                ],
            ],
        ];

        // Ne doit pas retourner 400 (pas de fatal error sur $payment->amount)
        $this->webhook($event)->assertStatus(200);
    }

    // ─────────────────────────────────────────────────────────────
    // 12. UNKNOWN EVENT — doit être accepté sans erreur
    // ─────────────────────────────────────────────────────────────

    /** @test */
    public function test_unhandled_event_type_returns_200(): void
    {
        $event = [
            'type' => 'customer.created',
            'data' => ['object' => ['id' => 'cus_test']],
        ];

        $this->webhook($event)->assertStatus(200);
    }

    // ─────────────────────────────────────────────────────────────
    // CHARGE.REFUNDED — remboursement
    // ─────────────────────────────────────────────────────────────

    /** @test */
    public function test_charge_refunded_marks_payment_and_order_refunded(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        [$program, $class] = $this->makeProgram();

        $order = Order::factory()->create([
            'student_id'         => $student->id,
            'program_id'         => $program->id,
            'class_id'           => $class->id,
            'status'             => 'paid',
            'installments_count' => 1,
            'payment_method'     => 'stripe',
        ]);

        $payment = OrderPayment::create([
            'order_id'                 => $order->id,
            'amount'                   => 100,
            'installment_number'       => 1,
            'status'                   => 'succeeded',
            'paid_at'                  => now(),
            'stripe_payment_intent_id' => 'pi_refund_test',
            'is_recovery_payment'      => false,
        ]);

        $event = [
            'type' => 'charge.refunded',
            'data' => [
                'object' => [
                    'id'              => 'ch_refund_test',
                    'payment_intent'  => 'pi_refund_test',
                    'refunded'        => true,
                    'amount'          => 10000,
                    'amount_refunded' => 10000,
                ],
            ],
        ];

        $this->webhook($event)->assertStatus(200);

        $payment->refresh();
        $this->assertEquals('refunded', $payment->status);

        $order->refresh();
        $this->assertEquals('refunded', $order->status);

        $this->assertDatabaseHas('notifications', [
            'user_id'  => $student->id,
            'type'     => 'payment',
            'category' => 'payment_refunded',
        ]);
    }

    /** @test */
    public function test_charge_refunded_partial_is_ignored(): void
    {
        [$program, $class] = $this->makeProgram();

        $order = Order::factory()->create([
            'program_id'         => $program->id,
            'class_id'           => $class->id,
            'status'             => 'paid',
            'installments_count' => 1,
            'payment_method'     => 'stripe',
        ]);

        $payment = OrderPayment::create([
            'order_id'                 => $order->id,
            'amount'                   => 100,
            'installment_number'       => 1,
            'status'                   => 'succeeded',
            'paid_at'                  => now(),
            'stripe_payment_intent_id' => 'pi_partial_refund',
            'is_recovery_payment'      => false,
        ]);

        $event = [
            'type' => 'charge.refunded',
            'data' => [
                'object' => [
                    'id'              => 'ch_partial',
                    'payment_intent'  => 'pi_partial_refund',
                    'refunded'        => false,
                    'amount'          => 10000,
                    'amount_refunded' => 4000,
                ],
            ],
        ];

        $this->webhook($event)->assertStatus(200);

        // Remboursement partiel : le paiement reste encaissé
        $payment->refresh();
        $this->assertEquals('succeeded', $payment->status);
    }
}
