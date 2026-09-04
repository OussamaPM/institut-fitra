<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dashboard_alert_dismissals', function (Blueprint $table): void {
            // hidden = masquée, réaffichable ; deleted = supprimée définitivement
            $table->string('mode')->default('hidden')->after('alert_type');
        });
    }

    public function down(): void
    {
        Schema::table('dashboard_alert_dismissals', function (Blueprint $table): void {
            $table->dropColumn('mode');
        });
    }
};
