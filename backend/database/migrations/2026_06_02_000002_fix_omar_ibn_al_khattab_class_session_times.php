<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

return new class extends Migration
{
    /**
     * Aligne les sessions planifiées de la classe "Omar ibn Al-Khattab" sur le
     * créneau lundi & jeudi 19:00-20:15 (75 min). Seules les sessions à venir
     * (status = scheduled) tombant un lundi (DAYOFWEEK=2) ou un jeudi (DAYOFWEEK=5)
     * sont modifiées ; les dates/jours sont conservés, seul l'horaire est corrigé.
     *
     * No-op si la classe n'existe pas ou si plusieurs classes correspondent
     * (dev/CI/nouveau clone).
     */
    public function up(): void
    {
        $classes = DB::table('classes')
            ->where('name', 'like', '%Omar ibn%Khattab%')
            ->get(['id', 'name']);

        if ($classes->count() !== 1) {
            Log::info('Migration fix_omar_ibn_al_khattab_class_session_times : '.$classes->count().' classe(s) correspondante(s), no-op.');

            return;
        }

        $classId = $classes->first()->id;

        $updated = DB::table('class_sessions')
            ->where('class_id', $classId)
            ->where('status', 'scheduled')
            ->whereIn(DB::raw('DAYOFWEEK(scheduled_at)'), [2, 5]) // 2 = lundi, 5 = jeudi
            ->update([
                'scheduled_at' => DB::raw("DATE_FORMAT(scheduled_at, '%Y-%m-%d 19:00:00')"),
                'duration_minutes' => 75,
                'updated_at' => now(),
            ]);

        Log::info("Migration fix_omar_ibn_al_khattab_class_session_times : {$updated} session(s) mises à jour (classe {$classId}).");
    }

    /**
     * Modification one-shot sur les données prod, pas de rollback automatique.
     */
    public function down(): void {}
};