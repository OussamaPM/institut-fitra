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
        Schema::table('order_payments', function (Blueprint $table) {
            // Référence au paiement échoué que ce paiement régularise
            $table->foreignId('recovery_for_payment_id')
                ->nullable()
                ->after('next_retry_at')
                ->constrained('order_payments')
                ->nullOnDelete();

            // Indicateur si ce paiement est une régularisation manuelle
            $table->boolean('is_recovery_payment')->default(false)->after('recovery_for_payment_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('order_payments', function (Blueprint $table) {
            $table->dropForeign(['recovery_for_payment_id']);
            $table->dropColumn(['recovery_for_payment_id', 'is_recovery_payment']);
        });
    }
};
