<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\ClassModel;
use App\Models\ProgramLevel;
use App\Models\Session;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class SessionGeneratorService
{
    /**
     * Correspondance jours français → constantes Carbon.
     */
    private const DAY_MAPPING = [
        'lundi' => Carbon::MONDAY,
        'mardi' => Carbon::TUESDAY,
        'mercredi' => Carbon::WEDNESDAY,
        'jeudi' => Carbon::THURSDAY,
        'vendredi' => Carbon::FRIDAY,
        'samedi' => Carbon::SATURDAY,
        'dimanche' => Carbon::SUNDAY,
    ];

    /**
     * Les horaires saisis dans les schedules sont interprétés comme des
     * heures locales Europe/Paris. Le générateur les convertit en UTC
     * avant stockage (app.timezone = UTC) pour que le frontend (qui parse
     * l'ISO avec Z) ré-affiche la bonne heure locale dans le navigateur.
     */
    private const SCHEDULE_TIMEZONE = 'Europe/Paris';

    /**
     * Génère les sessions du niveau 1 (programme de base) pour une classe,
     * à partir de l'emploi du temps du programme et des dates de la classe.
     * Ces sessions ont program_level_id = null.
     */
    public function generateSessionsForClass(ClassModel $class): Collection
    {
        $class->load('program');
        $program = $class->program;

        if (! $class->schedule || count($class->schedule) === 0) {
            throw new \Exception('La classe n\'a pas d\'emploi du temps défini.');
        }

        return $this->generateSessions(
            classId: $class->id,
            programLevelId: null,
            teacherId: $program->teacher_id,
            schedule: $class->schedule,
            startDate: Carbon::parse($class->start_date),
            endDate: Carbon::parse($class->end_date),
            titlePrefix: $program->name,
            description: "Session automatique de {$program->subject}",
        );
    }

    /**
     * Génère les sessions d'un niveau supérieur pour une classe,
     * à partir de l'emploi du temps du niveau (ou d'un override par activation)
     * et des dates de l'activation. Ces sessions sont taguées avec
     * program_level_id = $level->id.
     */
    public function generateSessionsForLevelActivation(
        ClassModel $class,
        ProgramLevel $level,
        Carbon $startDate,
        Carbon $endDate,
        ?array $scheduleOverride = null
    ): Collection {
        $schedule = $scheduleOverride ?: $level->schedule;

        if (! $schedule || count($schedule) === 0) {
            throw new \Exception('Le niveau n\'a pas d\'emploi du temps défini.');
        }

        $class->loadMissing('program');
        $teacherId = $level->teacher_id ?? $class->program?->teacher_id;

        return $this->generateSessions(
            classId: $class->id,
            programLevelId: $level->id,
            teacherId: $teacherId,
            schedule: $schedule,
            startDate: $startDate,
            endDate: $endDate,
            titlePrefix: $level->name,
            description: "Session automatique - {$level->name}",
        );
    }

    /**
     * Logique commune de génération des sessions récurrentes.
     */
    private function generateSessions(
        int $classId,
        ?int $programLevelId,
        ?int $teacherId,
        array $schedule,
        Carbon $startDate,
        Carbon $endDate,
        string $titlePrefix,
        string $description
    ): Collection {
        $sessions = collect();

        foreach ($schedule as $slot) {
            $dayOfWeek = self::DAY_MAPPING[strtolower($slot['day'])] ?? null;

            if ($dayOfWeek === null) {
                continue;
            }

            // Première occurrence de ce jour à partir de la date de début
            $currentDate = $startDate->copy();
            if ($currentDate->dayOfWeek !== $dayOfWeek) {
                $currentDate->next($dayOfWeek);
            }

            while ($currentDate->lte($endDate)) {
                [$startHour, $startMinute] = explode(':', $slot['start_time']);
                [$endHour, $endMinute] = explode(':', $slot['end_time']);

                $sessionStart = Carbon::create(
                    $currentDate->year,
                    $currentDate->month,
                    $currentDate->day,
                    (int) $startHour,
                    (int) $startMinute,
                    0,
                    self::SCHEDULE_TIMEZONE
                )->utc();

                $sessionEnd = Carbon::create(
                    $currentDate->year,
                    $currentDate->month,
                    $currentDate->day,
                    (int) $endHour,
                    (int) $endMinute,
                    0,
                    self::SCHEDULE_TIMEZONE
                )->utc();

                $durationMinutes = $sessionStart->diffInMinutes($sessionEnd);

                // Éviter les doublons (même classe, même niveau, même créneau)
                $existingSession = Session::where('class_id', $classId)
                    ->where('program_level_id', $programLevelId)
                    ->where('scheduled_at', $sessionStart->toDateTimeString())
                    ->first();

                if ($existingSession) {
                    $currentDate->addWeek();

                    continue;
                }

                $session = Session::create([
                    'class_id' => $classId,
                    'program_level_id' => $programLevelId,
                    'teacher_id' => $teacherId,
                    'title' => $titlePrefix.' - '.ucfirst($slot['day']),
                    'description' => $description,
                    'scheduled_at' => $sessionStart->toDateTimeString(),
                    'duration_minutes' => $durationMinutes,
                    'status' => 'scheduled',
                ]);

                $sessions->push($session);
                $currentDate->addWeek();
            }
        }

        return $sessions;
    }

    /**
     * Supprime les sessions à venir du niveau de base d'une classe.
     */
    public function deleteUpcomingSessions(ClassModel $class): int
    {
        return Session::where('class_id', $class->id)
            ->whereNull('program_level_id')
            ->where('status', 'scheduled')
            ->where('scheduled_at', '>', now())
            ->delete();
    }

    /**
     * Supprime toutes les sessions du niveau de base d'une classe (régénération).
     * Ne touche pas aux sessions des niveaux supérieurs (gérées via activation).
     */
    public function deleteAllSessions(ClassModel $class): int
    {
        return Session::where('class_id', $class->id)
            ->whereNull('program_level_id')
            ->delete();
    }

    /**
     * Supprime les sessions d'un niveau supérieur pour une classe.
     */
    public function deleteLevelSessions(ClassModel $class, ProgramLevel $level): int
    {
        return Session::where('class_id', $class->id)
            ->where('program_level_id', $level->id)
            ->delete();
    }

    /**
     * Régénère les sessions du niveau de base d'une classe.
     */
    public function regenerateSessionsForClass(ClassModel $class): Collection
    {
        $this->deleteAllSessions($class);

        return $this->generateSessionsForClass($class);
    }
}
