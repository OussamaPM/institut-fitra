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
        // SQLite ne supporte pas MODIFY COLUMN, donc on vérifie le driver
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE orders MODIFY COLUMN payment_method ENUM('stripe', 'paypal', 'free', 'cash', 'transfer') DEFAULT 'stripe'");
        }
        // Pour SQLite (tests), on ne fait rien car le champ est un string
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE orders MODIFY COLUMN payment_method ENUM('stripe', 'paypal', 'free') DEFAULT 'stripe'");
        }
    }
};
