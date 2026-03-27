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
        Schema::table('programs', function (Blueprint $table) {
            // Supprimer les anciens champs qui ne sont plus nécessaires
            $table->dropColumn(['duration_weeks', 'level']);

            // Ajouter les nouveaux champs
            $table->unsignedBigInteger('teacher_id')->nullable()->after('created_by');
            $table->json('schedule')->nullable()->after('teacher_id'); // [{day: 'lundi', start_time: '09:00', end_time: '11:00'}]
            $table->string('subject')->after('schedule'); // Matière étudiée
            $table->text('subject_description')->nullable()->after('subject'); // Descriptif de la matière
            $table->text('enrollment_conditions')->nullable()->after('subject_description'); // Conditions d'inscription
            $table->integer('max_installments')->default(1)->after('price'); // Nombre de paiements acceptés (1 = paiement unique)

            // Ajouter la clé étrangère pour teacher_id
            $table->foreign('teacher_id')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('programs', function (Blueprint $table) {
            // Supprimer la clé étrangère
            $table->dropForeign(['teacher_id']);

            // Supprimer les nouveaux champs
            $table->dropColumn([
                'teacher_id',
                'schedule',
                'subject',
                'subject_description',
                'enrollment_conditions',
                'max_installments',
            ]);

            // Restaurer les anciens champs
            $table->integer('duration_weeks')->after('price');
            $table->enum('level', ['beginner', 'intermediate', 'advanced'])->after('duration_weeks');
        });
    }
};
