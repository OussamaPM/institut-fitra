<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('program_levels', function (Blueprint $table) {
            $table->dropForeign(['default_class_id']);
            $table->dropColumn(['default_class_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::table('program_levels', function (Blueprint $table) {
            $table->foreignId('default_class_id')->nullable()->constrained('classes')->nullOnDelete();
            $table->boolean('is_active')->default(false);
        });
    }
};
