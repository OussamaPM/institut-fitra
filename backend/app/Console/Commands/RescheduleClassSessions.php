<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\ClassModel;
use App\Models\Session;
use App\Services\SessionGeneratorService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Commande ponctuelle : ré-affecte les jours/horaires de cours de classes
 * précises et régénère leurs sessions.
 *
 *   Abou Bakr As-Siddiq  → niveau 2 : Lundi & Jeudi 20h30-21h45
 *   Omar ibn Al-Khattab  → niveau 1 : Mercredi & Dimanche 20h30-21h45
 *
 * Usage :
 *   php artisan sessions:reschedule --dry-run   (aperçu, ne modifie rien)
 *   php artisan sessions:reschedule             (applique)
 *   php artisan sessions:reschedule --force     (applique même si replays/supports existants)
 */
class RescheduleClassSessions extends Command
{
    protected $signature = 'sessions:reschedule {--dry-run : Affiche les changements sans rien modifier} {--force : Régénère même si des sessions ont des replays/supports}';

    protected $description = 'Met à jour les jours/horaires et régénère les sessions de classes précises';

    /**
     * Cibles. level = 1 → emploi du temps de la classe (niveau de base).
     *         level ≥ 2 → emploi du temps de l\'activation du niveau sur cette classe.
     */
    private array $targets = [
        [
            'match' => 'Abou Bakr',
            'level' => 2,
            'schedule' => [
                ['day' => 'lundi', 'start_time' => '20:30', 'end_time' => '21:45'],
                ['day' => 'jeudi', 'start_time' => '20:30', 'end_time' => '21:45'],
            ],
        ],
        [
            'match' => 'Omar ibn',
            'level' => 1,
            'schedule' => [
                ['day' => 'mercredi', 'start_time' => '20:30', 'end_time' => '21:45'],
                ['day' => 'dimanche', 'start_time' => '20:30', 'end_time' => '21:45'],
            ],
        ],
    ];

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $force = (bool) $this->option('force');

        if ($dryRun) {
            $this->warn('=== DRY-RUN : aucune modification ne sera enregistrée ===');
        }

        $generator = new SessionGeneratorService;
        $hadError = false;

        foreach ($this->targets as $target) {
            $this->line('');
            $this->info("► Cible : « {$target['match']} » — niveau {$target['level']}");

            // --- Résolution de la classe (exactement une attendue) ---
            $classes = ClassModel::where('name', 'like', '%'.$target['match'].'%')->get();
            if ($classes->isEmpty()) {
                $this->error("  ✗ Aucune classe ne correspond à « {$target['match'] }».");
                $hadError = true;

                continue;
            }
            if ($classes->count() > 1) {
                $this->error('  ✗ Plusieurs classes correspondent (ambigu) : '.$classes->pluck('name')->implode(' | '));
                $hadError = true;

                continue;
            }
            $class = $classes->first();
            $this->line("  Classe #{$class->id} : {$class->name} (programme : ".optional($class->program)->name.')');

            if ($target['level'] === 1) {
                $hadError = $this->handleBaseLevel($class, $target['schedule'], $generator, $dryRun, $force) || $hadError;
            } else {
                $hadError = $this->handleUpperLevel($class, $target['level'], $target['schedule'], $generator, $dryRun, $force) || $hadError;
            }
        }

        $this->line('');
        if ($hadError) {
            $this->error('Terminé avec des avertissements/erreurs (voir ci-dessus).');

            return self::FAILURE;
        }
        $this->info($dryRun ? 'Dry-run terminé.' : 'Terminé avec succès.');

        return self::SUCCESS;
    }

    /**
     * Niveau 1 : emploi du temps porté par la classe.
     */
    private function handleBaseLevel(ClassModel $class, array $schedule, SessionGeneratorService $generator, bool $dryRun, bool $force): bool
    {
        $this->line('  Emploi du temps actuel : '.$this->fmtSchedule($class->schedule));
        $this->line('  Nouvel emploi du temps : '.$this->fmtSchedule($schedule));
        $this->line('  Période classe : '.Carbon::parse($class->start_date)->toDateString().' → '.Carbon::parse($class->end_date)->toDateString());

        $query = Session::where('class_id', $class->id)->whereNull('program_level_id');
        if ($this->guardAndReport($query, $force) === false && ! $force) {
            return true;
        }

        if ($dryRun) {
            $this->comment('  (dry-run) Régénérerait les sessions du niveau de base.');

            return false;
        }

        DB::transaction(function () use ($class, $schedule, $generator) {
            $class->schedule = $schedule;
            $class->save();
            $sessions = $generator->regenerateSessionsForClass($class);
            $this->info("  ✓ {$sessions->count()} session(s) du niveau de base régénérée(s).");
            $this->previewGenerated($class->id, null);
        });

        return false;
    }

    /**
     * Niveau ≥ 2 : emploi du temps porté par l\'activation du niveau sur la classe.
     */
    private function handleUpperLevel(ClassModel $class, int $levelNumber, array $schedule, SessionGeneratorService $generator, bool $dryRun, bool $force): bool
    {
        $activation = $class->levelActivations()
            ->whereHas('programLevel', fn ($q) => $q->where('level_number', $levelNumber))
            ->with('programLevel')
            ->first();

        if (! $activation || ! $activation->programLevel) {
            $this->error("  ✗ Le niveau {$levelNumber} n'est pas activé sur cette classe (aucune activation trouvée).");

            return true;
        }
        $level = $activation->programLevel;

        if (! $activation->start_date || ! $activation->end_date) {
            $this->error("  ✗ L'activation du niveau {$levelNumber} n'a pas de dates de début/fin.");

            return true;
        }

        $this->line("  Niveau : #{$level->id} {$level->name}");
        $this->line('  Emploi du temps actuel : '.$this->fmtSchedule($activation->schedule ?: $level->schedule));
        $this->line('  Nouvel emploi du temps : '.$this->fmtSchedule($schedule));
        $this->line('  Période activation : '.Carbon::parse($activation->start_date)->toDateString().' → '.Carbon::parse($activation->end_date)->toDateString());

        $query = Session::where('class_id', $class->id)->where('program_level_id', $level->id);
        if ($this->guardAndReport($query, $force) === false && ! $force) {
            return true;
        }

        if ($dryRun) {
            $this->comment("  (dry-run) Régénérerait les sessions du niveau {$levelNumber}.");

            return false;
        }

        DB::transaction(function () use ($class, $level, $activation, $schedule, $generator) {
            $activation->schedule = $schedule;
            $activation->save();
            $generator->deleteLevelSessions($class, $level);
            $sessions = $generator->generateSessionsForLevelActivation(
                $class,
                $level,
                Carbon::parse($activation->start_date),
                Carbon::parse($activation->end_date),
                $schedule
            );
            $this->info("  ✓ {$sessions->count()} session(s) du niveau {$level->level_number} régénérée(s).");
            $this->previewGenerated($class->id, $level->id);
        });

        return false;
    }

    /**
     * Compte les sessions impactées + leurs replays/supports. Renvoie false si
     * du contenu serait perdu (et --force absent).
     */
    private function guardAndReport($query, bool $force): bool
    {
        $sessions = (clone $query)->get();
        $total = $sessions->count();
        $withReplay = $sessions->whereNotNull('replay_url')->count();
        $materials = $total > 0
            ? DB::table('session_materials')->whereIn('session_id', $sessions->pluck('id'))->count()
            : 0;

        $this->line("  Sessions actuelles de ce niveau : {$total} (dont {$withReplay} avec replay, {$materials} support(s))");

        if (($withReplay > 0 || $materials > 0) && ! $force) {
            $this->warn('  ⚠ Des replays/supports sont attachés à ces sessions : régénération IGNORÉE.');
            $this->warn('     Relance avec --force pour régénérer malgré tout (ce contenu sera perdu).');

            return false;
        }

        return true;
    }

    /**
     * Affiche les 4 premières sessions générées (heure locale Europe/Paris) pour vérification.
     */
    private function previewGenerated(int $classId, ?int $levelId): void
    {
        $q = Session::where('class_id', $classId);
        $levelId === null ? $q->whereNull('program_level_id') : $q->where('program_level_id', $levelId);
        $rows = $q->orderBy('scheduled_at')->limit(4)->get();
        foreach ($rows as $s) {
            $local = Carbon::parse($s->scheduled_at)->setTimezone('Europe/Paris');
            $this->line('     • '.$local->locale('fr')->isoFormat('dddd D MMM YYYY HH:mm').' (Paris) — '.$s->duration_minutes.' min');
        }
    }

    private function fmtSchedule(?array $schedule): string
    {
        if (! $schedule || count($schedule) === 0) {
            return '(aucun)';
        }

        return collect($schedule)
            ->map(fn ($s) => ucfirst($s['day']).' '.$s['start_time'].'-'.$s['end_time'])
            ->implode(', ');
    }
}
