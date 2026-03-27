<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('order_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();

            // Montant de ce paiement
            $table->decimal('amount', 10, 2);

            // Numéro du paiement (1, 2, 3... pour paiement échelonné)
            $table->integer('installment_number')->default(1);

            // Statut : pending, succeeded, failed, refunded
            $table->enum('status', ['pending', 'scheduled', 'succeeded', 'failed', 'refunded'])->default('pending');

            // Date prévue du paiement (pour paiements échelonnés)
            $table->timestamp('scheduled_at')->nullable();

            // Date effective du paiement
            $table->timestamp('paid_at')->nullable();

            // Stripe
            $table->string('stripe_payment_intent_id')->nullable();
            $table->string('stripe_charge_id')->nullable();

            // Erreur éventuelle
            $table->text('error_message')->nullable();

            $table->timestamps();

            // Index
            $table->index('status');
            $table->index('scheduled_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_payments');
    }
};
