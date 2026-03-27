<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Ajouter les champs subscription à la table orders
        Schema::table('orders', function (Blueprint $table) {
            $table->string('stripe_subscription_id')->nullable()->after('stripe_payment_intent_id');
            $table->string('stripe_price_id')->nullable()->after('stripe_subscription_id');
        });

        // Ajouter les champs invoice à la table order_payments
        Schema::table('order_payments', function (Blueprint $table) {
            $table->string('stripe_invoice_id')->nullable()->after('stripe_charge_id');
            $table->integer('attempt_count')->default(0)->after('stripe_invoice_id');
            $table->timestamp('next_retry_at')->nullable()->after('attempt_count');
            $table->timestamp('last_attempt_at')->nullable()->after('next_retry_at');
        });

        // Ajouter les champs category et action_url à la table notifications
        Schema::table('notifications', function (Blueprint $table) {
            $table->string('category')->nullable()->after('type');
            $table->string('action_url')->nullable()->after('message');
        });

        // Modifier le type enum pour inclure 'payment'
        // Note: En MySQL, on doit recréer la colonne pour modifier l'enum
        // SQLite ne supporte pas MODIFY COLUMN, donc on vérifie le driver
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE notifications MODIFY COLUMN type ENUM('session', 'message', 'enrollment', 'material', 'payment', 'level', 'other') NOT NULL");
        }
        // Pour SQLite, le type est TEXT donc pas besoin de modifier
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['stripe_subscription_id', 'stripe_price_id']);
        });

        Schema::table('order_payments', function (Blueprint $table) {
            $table->dropColumn(['stripe_invoice_id', 'attempt_count', 'next_retry_at', 'last_attempt_at']);
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->dropColumn(['category', 'action_url']);
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE notifications MODIFY COLUMN type ENUM('session', 'message', 'enrollment', 'material', 'other') NOT NULL");
        }
    }
};
