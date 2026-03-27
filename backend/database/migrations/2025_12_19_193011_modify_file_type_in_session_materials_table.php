<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Pour MySQL, modifier l'enum pour ajouter 'image'
        // Pour SQLite (tests), on ne fait rien car SQLite n'a pas de contrainte ENUM
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE session_materials MODIFY COLUMN file_type ENUM('pdf', 'image', 'video', 'audio', 'document', 'other')");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE session_materials MODIFY COLUMN file_type ENUM('pdf', 'video', 'audio', 'document', 'other')");
        }
    }
};
