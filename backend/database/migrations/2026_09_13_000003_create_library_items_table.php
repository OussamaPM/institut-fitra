<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('library_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('library_folder_id')->constrained('library_folders')->cascadeOnDelete();
            $table->string('title');
            $table->enum('type', ['video', 'audio', 'document']);
            // Catégorie média : URL du player extraite de l'iframe (Bunny, Vimeo...)
            $table->text('embed_url')->nullable();
            // Catégorie ressource : fichier PDF stocké sur Spaces
            $table->string('file_path')->nullable();
            // Nom d'origine, pour servir le téléchargement sous un nom lisible
            $table->string('original_name')->nullable();
            $table->unsignedBigInteger('file_size')->nullable();
            // Pas de valeur par défaut : la position est toujours attribuée par
            // LibraryService, sans quoi un oubli passerait inaperçu (items empilés à 0).
            $table->unsignedInteger('position');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['library_folder_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('library_items');
    }
};
