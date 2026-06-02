<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tracking_form_assignments', function (Blueprint $table) {
            // Date de dernière sauvegarde en brouillon (formulaire commencé mais pas encore soumis)
            $table->timestamp('draft_saved_at')->nullable()->after('completed_at');
        });
    }

    public function down(): void
    {
        Schema::table('tracking_form_assignments', function (Blueprint $table) {
            $table->dropColumn('draft_saved_at');
        });
    }
};