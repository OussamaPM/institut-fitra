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
        Schema::create('orders', function (Blueprint $table) {
            $table->id();

            // Élève (peut être null si créé avant inscription)
            $table->foreignId('student_id')->nullable()->constrained('users')->nullOnDelete();

            // Programme et classe
            $table->foreignId('program_id')->constrained('programs')->cascadeOnDelete();
            $table->foreignId('class_id')->nullable()->constrained('classes')->nullOnDelete();

            // Informations client (stockées même si user non créé)
            $table->string('customer_email');
            $table->string('customer_first_name');
            $table->string('customer_last_name');

            // Montants
            $table->decimal('total_amount', 10, 2);
            $table->integer('installments_count')->default(1); // Nombre de paiements prévus

            // Mode de paiement : stripe, paypal, free
            $table->enum('payment_method', ['stripe', 'paypal', 'free'])->default('stripe');

            // Statut : pending, partial, paid, failed, refunded
            $table->enum('status', ['pending', 'partial', 'paid', 'failed', 'refunded', 'cancelled'])->default('pending');

            // Stripe
            $table->string('stripe_checkout_session_id')->nullable();
            $table->string('stripe_customer_id')->nullable();
            $table->string('stripe_payment_intent_id')->nullable();

            // Notes admin
            $table->text('admin_notes')->nullable();

            $table->timestamps();

            // Index pour recherche
            $table->index('customer_email');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
