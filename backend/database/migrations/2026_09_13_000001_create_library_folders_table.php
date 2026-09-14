<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('library_folders', function (Blueprint $table) {
            $table->id();
            // 'media' = vidéos/audios (embed iframe) | 'resource' = documents PDF
            $table->enum('category', ['media', 'resource']);
            $table->string('title');
            // Un dossier est invisible des élèves tant qu'il n'est pas publié
            $table->enum('status', ['draft', 'published'])->default('draft');
            // true = accessible à tous les utilisateurs, quelles que soient classe et niveau
            $table->boolean('is_public')->default(false);
            // On conserve le dossier si le compte de son auteur est supprimé
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            // Toutes les listes filtrent sur le couple (catégorie, statut)
            $table->index(['category', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('library_folders');
    }
};
