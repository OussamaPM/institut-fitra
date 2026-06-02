<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * L'emploi du temps (jours/heures de cours) est désormais porté par la classe
     * et non plus par le programme. On copie l'emploi du temps du programme vers
     * ses classes existantes pour préserver leurs horaires actuels.
     */
    public function up(): void
    {
        Schema::table('classes', function (Blueprint $table) {
            // [{day: 'lundi', start_time: '09:00', end_time: '11:00'}]
            $table->json('schedule')->nullable()->after('end_date');
        });

        // Backfill : chaque classe hérite de l'emploi du temps de son programme
        DB::table('classes')
            ->join('programs', 'classes.program_id', '=', 'programs.id')
            ->whereNull('classes.schedule')
            ->whereNotNull('programs.schedule')
            ->select('classes.id', 'programs.schedule as program_schedule')
            ->orderBy('classes.id')
            ->each(function ($row) {
                DB::table('classes')
                    ->where('id', $row->id)
                    ->update(['schedule' => $row->program_schedule]);
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('classes', function (Blueprint $table) {
            $table->dropColumn('schedule');
        });
    }
};
