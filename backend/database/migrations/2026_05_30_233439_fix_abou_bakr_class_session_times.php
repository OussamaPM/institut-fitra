<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

return new class extends Migration
{
    /**
     * Aligne les sessions de niveau 1 de la classe "Abou Bakr" sur le créneau
     * 21h00-22h30 (le programme Dar al-Arqam reste à 19h-20h15 car il est
     * rattaché à la nouvelle classe Omar ibn Khattab).
     *
     * No-op si la classe n'existe pas (dev/CI/nouveau clone).
     */
    public function up(): void
    {
        $class = DB::table('classes')
            ->where('name', 'Abou Bakr As-Siddiq')
            ->first(['id']);

        if (! $class) {
            Log::info('Migration fix_abou_bakr_class_session_times : classe introuvable, no-op.');

            return;
        }

        $classId = $class->id;

        DB::table('class_sessions')
            ->where('class_id', $classId)
            ->whereNull('program_level_id')
            ->update([
                'scheduled_at' => DB::raw("DATE_FORMAT(scheduled_at, '%Y-%m-%d 21:00:00')"),
                'duration_minutes' => 90,
                'updated_at' => now(),
            ]);
    }

    /**
     * Modification one-shot sur les données prod, pas de rollback automatique.
     */
    public function down(): void {}
};
