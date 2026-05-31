<?php

use Carbon\Carbon;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Les sessions générées par SessionGeneratorService stockaient l'heure
     * du schedule comme du wall-clock UTC, ce qui décalait l'affichage
     * frontend (qui convertit l'ISO Z en heure locale du navigateur).
     *
     * Le générateur traite désormais le schedule comme du wall-clock
     * Europe/Paris. Cette migration ré-aligne les sessions existantes :
     * la valeur stockée est interprétée comme du Paris-local et convertie
     * en UTC pour stockage.
     *
     * Filtre uniquement les sessions générées automatiquement (description
     * débute par "Session automatique") afin de ne pas toucher aux sessions
     * créées manuellement via le formulaire admin (qui sont déjà correctes).
     */
    public function up(): void
    {
        DB::table('class_sessions')
            ->where('description', 'like', 'Session automatique%')
            ->orderBy('id')
            ->chunkById(500, function ($sessions) {
                foreach ($sessions as $session) {
                    $wallClock = Carbon::parse($session->scheduled_at, 'Europe/Paris')
                        ->setTimezone('UTC')
                        ->toDateTimeString();

                    DB::table('class_sessions')
                        ->where('id', $session->id)
                        ->update([
                            'scheduled_at' => $wallClock,
                            'updated_at' => now(),
                        ]);
                }
            });
    }

    /**
     * Modification one-shot des données : pas de rollback automatique.
     */
    public function down(): void {}
};
