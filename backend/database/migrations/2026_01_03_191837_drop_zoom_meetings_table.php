<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::dropIfExists('zoom_meetings');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::create('zoom_meetings', function ($table) {
            $table->id();
            $table->foreignId('session_id')->unique()->constrained('class_sessions')->onDelete('cascade');
            $table->string('meeting_id');
            $table->text('join_url');
            $table->text('start_url');
            $table->string('password')->nullable();
            $table->timestamps();
        });
    }
};
