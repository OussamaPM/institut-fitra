<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('class_sessions', function (Blueprint $table) {
            // null = niveau 1 (programme de base) ; sinon le niveau supérieur concerné
            $table->foreignId('program_level_id')
                ->nullable()
                ->after('class_id')
                ->constrained('program_levels')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('class_sessions', function (Blueprint $table) {
            $table->dropForeign(['program_level_id']);
            $table->dropColumn('program_level_id');
        });
    }
};
