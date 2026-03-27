<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->string('attachment_path')->nullable()->after('content');
            $table->enum('attachment_type', ['image', 'pdf', 'audio'])->nullable()->after('attachment_path');
            $table->string('attachment_original_name')->nullable()->after('attachment_type');
            $table->unsignedInteger('attachment_size')->nullable()->after('attachment_original_name');
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn(['attachment_path', 'attachment_type', 'attachment_original_name', 'attachment_size']);
        });
    }
};
