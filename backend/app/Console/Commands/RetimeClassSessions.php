<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\ClassModel;
use App\Models\Session;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Commande ponctuelle : modifie L'HEURE des sessions EXISTANTES (sans en créer
 * ni en supprimer) d'une classe, sur une fenêtre de dates et un niveau donnés.
 *
 *   Abou Bakr As-Siddiq — niveau 1 (base) — du 01/06/2026 au 29/06/2026
 *   → nouvelle heure : 21h00-22h15 (les jours/dates restent inchangés)
 *
 * Les replays/supports/présences sont préservés (mise à jour en place).
 *
 * Usage :
 *   php artisan sessions:retime --dry-run   (aperçu, ne modifie rien)
 *   php artisan sessions:retime             (applique)
 */
class RetimeClassSessions extends Command
{
    protected $signature = 'sessions:retime {--dry-run : Affiche les changements sans rien modifier}';

    protected $description = 'Modifie l\'heure des sessions existantes d\'une classe (sans création/suppression)';

    // --- Paramètres de la manipulation ponctuelle ---
    private string $classMatch = 'Abou Bakr';

    private ?int $levelNumber = 1;        // 1 = niveau de base (program_level_id NULL)

    private string $windowStart = '2026-06-01';

    private string $windowEnd = '2026-06-29';

    private string $newStartTime = '21:00';

    private string $newEndTime = '22:15';

    private const TZ = 'Europe/Paris';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        if ($dryRun) {
            $this->warn('=== DRY-RUN : aucune modification ne sera enregistrée ===');
        }

        // --- Résolution de la classe (exactement une attendue) ---
        $classes = ClassModel::where('name', 'like', '%'.$this->classMatch.'%')->get();
        if ($classes->isEmpty()) {
            $this->error("✗ Aucune classe ne correspond à « {$this->classMatch} ».");

            return self::FAILURE;
        }
        if ($classes->count() > 1) {
            $this->error('✗ Plusieurs classes correspondent (ambigu) : '.$classes->pluck('name')->implode(' | '));

            return self::FAILURE;
        }
        $class = $classes->first();

        $this->info("► Classe #{$class->id} : {$class->name} — niveau {$this->levelNumber}");
        $this->line("  Fenêtre : {$this->windowStart} → {$this->windowEnd} (heure locale Europe/Paris)");
        $this->line("  Nouvelle heure : {$this->newStartTime}-{$this->newEndTime}");

        // --- Résolution du program_level_id ciblé ---
        $programLevelId = null; // niveau 1
        if ($this->levelNumber > 1) {
            $activation = $class->levelActivations()
                ->whereHas('programLevel', fn ($q) => $q->where('level_number', $this->levelNumber))
                ->with('programLevel')->first();
            if (! $activation || ! $activation->programLevel) {
                $this->error("✗ Niveau {$this->levelNumber} non activé sur cette classe.");

                return self::FAILURE;
            }
            $programLevelId = $activation->programLevel->id;
        }

        // --- Sessions existantes du niveau, filtrées sur la fenêtre (date locale Paris) ---
        $query = Session::where('class_id', $class->id);
        $programLevelId === null ? $query->whereNull('program_level_id') : $query->where('program_level_id', $programLevelId);

        $sessions = $query->orderBy('scheduled_at')->get()->filter(function ($s) {
            $localDate = Carbon::parse($s->scheduled_at, 'UTC')->setTimezone(self::TZ)->toDateString();

            return $localDate >= $this->windowStart && $localDate <= $this->windowEnd;
        });

        if ($sessions->isEmpty()) {
            $this->warn('  Aucune session existante de ce niveau dans cette fenêtre. Rien à faire.');

            return self::SUCCESS;
        }

        $this->line("  {$sessions->count()} session(s) concernée(s) :");
        $changed = 0;

        DB::beginTransaction();
        try {
            foreach ($sessions as $s) {
                $local = Carbon::parse($s->scheduled_at, 'UTC')->setTimezone(self::TZ);
                [$sh, $sm] = explode(':', $this->newStartTime);
                [$eh, $em] = explode(':', $this->newEndTime);

                $newStart = Carbon::create($local->year, $local->month, $local->day, (int) $sh, (int) $sm, 0, self::TZ)->utc();
                $newEnd = Carbon::create($local->year, $local->month, $local->day, (int) $eh, (int) $em, 0, self::TZ)->utc();
                $newDuration = (int) $newStart->diffInMinutes($newEnd);

                $before = $local->locale('fr')->isoFormat('ddd D MMM').' '.$local->format('H:i');
                $after = $newStart->copy()->setTimezone(self::TZ)->format('H:i');
                $marker = ($s->scheduled_at === $newStart->toDateTimeString() && (int) $s->duration_minutes === $newDuration) ? ' (inchangée)' : '';
                $this->line("     • #{$s->id} {$before} → {$after} ({$newDuration} min){$marker}");

                if ($marker === '') {
                    $s->scheduled_at = $newStart->toDateTimeString();
                    $s->duration_minutes = $newDuration;
                    if (! $dryRun) {
                        $s->save();
                    }
                    $changed++;
                }
            }

            if ($dryRun) {
                DB::rollBack();
                $this->comment("  (dry-run) {$changed} session(s) seraient modifiée(s).");
            } else {
                DB::commit();
                $this->info("  ✓ {$changed} session(s) modifiée(s) (dates/jours inchangés).");
            }
        } catch (\Throwable $e) {
            DB::rollBack();
            $this->error('  ✗ Erreur, rollback : '.$e->getMessage());

            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
