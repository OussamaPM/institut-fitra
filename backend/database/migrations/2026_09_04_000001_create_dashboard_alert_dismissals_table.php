<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dashboard_alert_dismissals', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('alert_type');
            $table->timestamp('dismissed_at');
            $table->timestamps();

            $table->unique(['user_id', 'alert_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dashboard_alert_dismissals');
    }
};
