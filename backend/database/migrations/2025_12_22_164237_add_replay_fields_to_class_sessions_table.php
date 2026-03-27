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
        Schema::table('class_sessions', function (Blueprint $table) {
            $table->string('replay_url')->nullable()->after('status');
            $table->integer('replay_validity_days')->nullable()->after('replay_url');
            $table->timestamp('replay_added_at')->nullable()->after('replay_validity_days');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('class_sessions', function (Blueprint $table) {
            $table->dropColumn(['replay_url', 'replay_validity_days', 'replay_added_at']);
        });
    }
};
