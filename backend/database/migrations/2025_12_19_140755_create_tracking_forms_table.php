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
        // Table des formulaires de suivi
        Schema::create('tracking_forms', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Table des questions du formulaire
        Schema::create('tracking_form_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('form_id')->constrained('tracking_forms')->onDelete('cascade');
            $table->text('question');
            $table->enum('type', ['text', 'multiple_choice'])->default('text');
            $table->json('options')->nullable(); // Pour les QCM: ["Option 1", "Option 2", ...]
            $table->integer('order')->default(0);
            $table->boolean('required')->default(true);
            $table->timestamps();
        });

        // Table des assignations (à qui le formulaire est envoyé)
        Schema::create('tracking_form_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('form_id')->constrained('tracking_forms')->onDelete('cascade');
            $table->foreignId('student_id')->constrained('users')->onDelete('cascade');
            $table->timestamp('sent_at')->useCurrent();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->unique(['form_id', 'student_id']);
        });

        // Table des réponses
        Schema::create('tracking_form_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assignment_id')->constrained('tracking_form_assignments')->onDelete('cascade');
            $table->foreignId('question_id')->constrained('tracking_form_questions')->onDelete('cascade');
            $table->text('answer')->nullable(); // Réponse texte libre ou option sélectionnée
            $table->timestamps();

            $table->unique(['assignment_id', 'question_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tracking_form_responses');
        Schema::dropIfExists('tracking_form_assignments');
        Schema::dropIfExists('tracking_form_questions');
        Schema::dropIfExists('tracking_forms');
    }
};
