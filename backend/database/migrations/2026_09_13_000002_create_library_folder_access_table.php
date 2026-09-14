<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('library_folder_access', function (Blueprint $table) {
            $table->id();
            $table->foreignId('library_folder_id')->constrained('library_folders')->cascadeOnDelete();
            $table->foreignId('class_id')->constrained('classes')->cascadeOnDelete();
            // 1  = niveau de base : tous les inscrits de la classe, y compris ceux montés
            //      de niveau (le niveau 1 est inclusif, comme partout dans la plateforme)
            // 2+ = ce niveau précis : commande paid/partial requise pour ce niveau
            // NOT NULL : sans null, l'index unique ci-dessous est réellement appliqué
            // par MySQL et rend les lignes en double impossibles.
            $table->unsignedTinyInteger('level_number');
            $table->timestamps();

            $table->unique(['library_folder_id', 'class_id', 'level_number'], 'library_access_unique');
            $table->index(['class_id', 'level_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('library_folder_access');
    }
};
