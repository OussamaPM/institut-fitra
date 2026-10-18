<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Trace d'un changement de classe : l'inscription d'origine passe en `cancelled`
     * et pointe vers la classe d'arrivée. Colonnes nullables, sans effet sur l'existant.
     */
    public function up(): void
    {
        Schema::table('enrollments', function (Blueprint $table) {
            $table->foreignId('transferred_to_class_id')->nullable()->after('expires_at')
                ->constrained('classes')->nullOnDelete();
            $table->timestamp('transferred_at')->nullable()->after('transferred_to_class_id');
        });
    }

    public function down(): void
    {
        Schema::table('enrollments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('transferred_to_class_id');
            $table->dropColumn('transferred_at');
        });
    }
};
