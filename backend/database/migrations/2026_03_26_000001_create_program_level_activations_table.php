<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('program_level_activations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('program_level_id')->constrained('program_levels')->cascadeOnDelete();
            $table->foreignId('class_id')->constrained('classes')->cascadeOnDelete();
            $table->foreignId('activated_by')->constrained('users')->cascadeOnDelete();
            $table->timestamp('activated_at');
            $table->timestamps();

            // Un niveau ne peut être activé qu'une fois par classe
            $table->unique(['program_level_id', 'class_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('program_level_activations');
    }
};
