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
        Schema::table('orders', function (Blueprint $table) {
            $table->integer('level_number')->default(1)->after('class_id');
            $table->foreignId('program_level_id')->nullable()->after('level_number')
                ->constrained('program_levels')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['program_level_id']);
            $table->dropColumn(['level_number', 'program_level_id']);
        });
    }
};
