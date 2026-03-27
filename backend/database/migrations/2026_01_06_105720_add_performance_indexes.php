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
        // Index sur class_sessions pour améliorer les requêtes de planning
        Schema::table('class_sessions', function (Blueprint $table) {
            $table->index('scheduled_at', 'idx_sessions_scheduled_at');
            $table->index('status', 'idx_sessions_status');
            $table->index(['class_id', 'scheduled_at'], 'idx_sessions_class_scheduled');
        });

        // Index sur messages pour améliorer les requêtes de messagerie
        Schema::table('messages', function (Blueprint $table) {
            $table->index(['receiver_id', 'read_at'], 'idx_messages_receiver_read');
            $table->index(['sender_id', 'receiver_id'], 'idx_messages_sender_receiver');
            $table->index('group_id', 'idx_messages_group');
        });

        // Index sur enrollments pour améliorer les requêtes d'inscription
        Schema::table('enrollments', function (Blueprint $table) {
            $table->index(['class_id', 'status'], 'idx_enrollments_class_status');
        });

        // Index sur orders pour améliorer les requêtes de commandes
        Schema::table('orders', function (Blueprint $table) {
            $table->index('status', 'idx_orders_status');
            $table->index(['student_id', 'status'], 'idx_orders_student_status');
        });

        // Index sur order_payments pour améliorer les requêtes de paiements
        Schema::table('order_payments', function (Blueprint $table) {
            $table->index(['order_id', 'status'], 'idx_payments_order_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('class_sessions', function (Blueprint $table) {
            $table->dropIndex('idx_sessions_scheduled_at');
            $table->dropIndex('idx_sessions_status');
            $table->dropIndex('idx_sessions_class_scheduled');
        });

        Schema::table('messages', function (Blueprint $table) {
            $table->dropIndex('idx_messages_receiver_read');
            $table->dropIndex('idx_messages_sender_receiver');
            $table->dropIndex('idx_messages_group');
        });

        Schema::table('enrollments', function (Blueprint $table) {
            $table->dropIndex('idx_enrollments_class_status');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex('idx_orders_status');
            $table->dropIndex('idx_orders_student_status');
        });

        Schema::table('order_payments', function (Blueprint $table) {
            $table->dropIndex('idx_payments_order_status');
        });
    }
};
