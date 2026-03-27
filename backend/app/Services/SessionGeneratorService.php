<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\ClassModel;
use App\Models\Session;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class SessionGeneratorService
{
    /**
     * Génère automatiquement toutes les sessions pour une classe
     * en fonction de l'emploi du temps du programme et des dates de la classe.
     */
    public function generateSessionsForClass(ClassModel $class): Collection
    {
        $class->load('program');
        $program = $class->program;

        if (! $program->schedule || count($program->schedule) === 0) {
            throw new \Exception('Le programme n\'a pas d\'emploi du temps défini.');
        }

        $sessions = collect();
        $startDate = Carbon::parse($class->start_date);
        $endDate = Carbon::parse($class->end_date);

        // Mapper les jours français vers les jours Carbon
        $dayMapping = [
            'lundi' => Carbon::MONDAY,
            'mardi' => Carbon::TUESDAY,
            'mercredi' => Carbon::WEDNESDAY,
            'jeudi' => Carbon::THURSDAY,
            'vendredi' => Carbon::FRIDAY,
            'samedi' => Carbon::SATURDAY,
            'dimanche' => Carbon::SUNDAY,
        ];

        // Pour chaque créneau dans l'emploi du temps
        foreach ($program->schedule as $slot) {
            $dayOfWeek = $dayMapping[strtolower($slot['day'])] ?? null;

            if ($dayOfWeek === null) {
                continue;
            }

            // Trouver la première occurrence de ce jour après la date de début
            $currentDate = $startDate->copy();
            if ($currentDate->dayOfWeek !== $dayOfWeek) {
                $currentDate->next($dayOfWeek);
            }

            // Générer toutes les sessions jusqu'à la date de fin
            while ($currentDate->lte($endDate)) {
                // Parser les heures
                [$startHour, $startMinute] = explode(':', $slot['start_time']);
                [$endHour, $endMinute] = explode(':', $slot['end_time']);

                $sessionStart = $currentDate->copy()
                    ->setTime((int) $startHour, (int) $startMinute, 0);

                $sessionEnd = $currentDate->copy()
                    ->setTime((int) $endHour, (int) $endMinute, 0);

                $durationMinutes = $sessionStart->diffInMinutes($sessionEnd);

                // Vérifier si une session existe déjà pour cette classe à cette date/heure
                $existingSession = Session::where('class_id', $class->id)
                    ->where('scheduled_at', $sessionStart->toDateTimeString())
                    ->first();

                if ($existingSession) {
                    // Session déjà existante, passer à la suivante
                    $currentDate->addWeek();

                    continue;
                }

                // Créer la session
                $session = Session::create([
                    'class_id' => $class->id,
                    'teacher_id' => $program->teacher_id,
                    'title' => $program->name.' - '.ucfirst($slot['day']),
                    'description' => "Session automatique de {$program->subject}",
                    'scheduled_at' => $sessionStart->toDateTimeString(),
                    'duration_minutes' => $durationMinutes,
                    'status' => 'scheduled',
                ]);

                $sessions->push($session);

                // Passer à la semaine suivante
                $currentDate->addWeek();
            }
        }

        return $sessions;
    }

    /**
     * Supprime toutes les sessions d'une classe qui n'ont pas encore eu lieu.
     */
    public function deleteUpcomingSessions(ClassModel $class): int
    {
        $deleted = Session::where('class_id', $class->id)
            ->where('status', 'scheduled')
            ->where('scheduled_at', '>', now())
            ->delete();

        return $deleted;
    }

    /**
     * Supprime TOUTES les sessions d'une classe (pour régénération complète).
     */
    public function deleteAllSessions(ClassModel $class): int
    {
        return Session::where('class_id', $class->id)->delete();
    }

    /**
     * Régénère toutes les sessions d'une classe (supprime TOUTES les sessions puis recrée).
     */
    public function regenerateSessionsForClass(ClassModel $class): Collection
    {
        $this->deleteAllSessions($class);

        return $this->generateSessionsForClass($class);
    }
}
