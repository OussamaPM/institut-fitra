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
        Schema::create('classes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('program_id')->constrained('programs')->onDelete('cascade');
            $table->string('name'); // ex: "Arabe Niveau 1 - Promotion 2025/2026"
            $table->string('academic_year'); // ex: "2025/2026"
            $table->date('start_date');
            $table->date('end_date');
            $table->integer('max_students')->nullable(); // Capacité maximale (null = illimité)
            $table->enum('status', ['planned', 'ongoing', 'completed', 'cancelled'])->default('planned');
            $table->timestamps();

            // Index pour recherche rapide
            $table->index(['program_id', 'academic_year']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('classes');
    }
};
