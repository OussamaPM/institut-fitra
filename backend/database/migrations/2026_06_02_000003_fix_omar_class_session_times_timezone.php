<?php

use Carbon\Carbon;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

return new class extends Migration
{
    /**
     * Corrige les horaires des sessions de la classe "Omar ibn Al-Khattab" :
     * la migration précédente (000002) avait écrit 19:00 en UTC brut, ce qui
     * s'affichait 21:00 en heure de Paris (+2 l'été). On rejoue la conversion
     * comme le générateur (SessionGeneratorService) : 19:00 Europe/Paris -> UTC,
     * calculée par date pour respecter le changement d'heure (CET/CEST).
     *
     * Cible les sessions planifiées tombant un lundi ou un jeudi.
     * No-op si la classe est absente ou ambiguë (dev/CI).
     */
    public function up(): void
    {
        $classes = DB::table('classes')
            ->where('name', 'like', '%Omar ibn%Khattab%')
            ->get(['id', 'name']);

        if ($classes->count() !== 1) {
            Log::info('Migration fix_omar_class_session_times_timezone : '.$classes->count().' classe(s), no-op.');

            return;
        }

        $classId = $classes->first()->id;

        $sessions = DB::table('class_sessions')
            ->where('class_id', $classId)
            ->where('status', 'scheduled')
            ->get(['id', 'scheduled_at']);

        $count = 0;

        foreach ($sessions as $session) {
            // Date civile (Paris) de la session
            $parisDate = Carbon::parse($session->scheduled_at, 'UTC')->setTimezone('Europe/Paris');

            if (! in_array($parisDate->dayOfWeek, [Carbon::MONDAY, Carbon::THURSDAY], true)) {
                continue;
            }

            // 19:00 heure de Paris ce jour-là, converti en UTC pour le stockage
            $start = Carbon::create($parisDate->year, $parisDate->month, $parisDate->day, 19, 0, 0, 'Europe/Paris')->utc();

            DB::table('class_sessions')
                ->where('id', $session->id)
                ->update([
                    'scheduled_at' => $start->toDateTimeString(),
                    'duration_minutes' => 75, // 19:00 -> 20:15
                    'updated_at' => now(),
                ]);

            $count++;
        }

        Log::info("Migration fix_omar_class_session_times_timezone : {$count} session(s) corrigée(s) (classe {$classId}).");
    }

    public function down(): void {}
};