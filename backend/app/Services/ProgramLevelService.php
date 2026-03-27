<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Order;
use App\Models\ProgramLevel;
use App\Models\ProgramLevelActivation;
use Illuminate\Support\Collection;

class ProgramLevelService
{
    /**
     * Récupérer le niveau actuel d'un élève pour un programme
     * Retourne 0 si l'élève n'a jamais payé ce programme
     */
    public function getStudentCurrentLevel(int $studentId, int $programId): int
    {
        return (int) Order::where('student_id', $studentId)
            ->where('program_id', $programId)
            ->where('status', 'paid')
            ->max('level_number') ?? 0;
    }

    /**
     * Récupérer le prochain niveau disponible pour un élève
     * Retourne null si pas de niveau disponible ou si l'élève n'a pas le niveau précédent
     */
    public function getNextAvailableLevel(int $studentId, int $programId): ?ProgramLevel
    {
        $currentLevel = $this->getStudentCurrentLevel($studentId, $programId);
        $nextLevelNumber = $currentLevel + 1;

        // Si l'élève n'a pas encore le niveau 1, il doit passer par le site vitrine
        if ($nextLevelNumber === 1) {
            return null;
        }

        return ProgramLevel::where('program_id', $programId)
            ->where('level_number', $nextLevelNumber)
            ->whereHas('activations')
            ->with(['program', 'teacher', 'activations.class'])
            ->first();
    }

    /**
     * Obtenir toutes les réinscriptions disponibles pour un élève
     * Parcourt tous les programmes où l'élève est inscrit et cherche les niveaux suivants actifs
     */
    public function getAvailableReinscriptions(int $studentId): Collection
    {
        // Récupérer tous les programmes où l'élève a une commande payée
        $programIds = Order::where('student_id', $studentId)
            ->where('status', 'paid')
            ->pluck('program_id')
            ->unique();

        $reinscriptions = collect();

        foreach ($programIds as $programId) {
            $nextLevel = $this->getNextAvailableLevel($studentId, $programId);
            if ($nextLevel) {
                $currentLevel = $this->getStudentCurrentLevel($studentId, $programId);
                $reinscriptions->push([
                    'program' => $nextLevel->program,
                    'level' => $nextLevel,
                    'current_level' => $currentLevel,
                ]);
            }
        }

        return $reinscriptions;
    }

    /**
     * Vérifier si un niveau peut être supprimé
     * Un niveau ne peut pas être supprimé si des élèves y sont inscrits
     */
    public function canDeleteLevel(ProgramLevel $level): bool
    {
        return ! Order::where('program_level_id', $level->id)
            ->whereIn('status', ['paid', 'partial'])
            ->exists();
    }

    /**
     * Vérifier si le prix d'un niveau peut être modifié
     * Le prix ne peut pas être modifié si des élèves y sont inscrits
     */
    public function canModifyPrice(ProgramLevel $level): bool
    {
        return ! Order::where('program_level_id', $level->id)
            ->whereIn('status', ['paid', 'partial'])
            ->exists();
    }

    /**
     * Obtenir les élèves éligibles pour notification lors de l'activation d'un niveau
     * Ce sont les élèves qui ont payé le niveau N-1
     * Si $sourceClassId est fourni, filtre uniquement les élèves de cette classe
     */
    public function getEligibleStudentsForNotification(ProgramLevel $level, ?int $sourceClassId = null): Collection
    {
        $previousLevel = $level->level_number - 1;

        $query = Order::where('program_id', $level->program_id)
            ->where('level_number', $previousLevel)
            ->where('status', 'paid')
            ->with('student.studentProfile');

        if ($sourceClassId !== null) {
            $query->where('class_id', $sourceClassId);
        }

        return $query->get()
            ->pluck('student')
            ->filter()
            ->unique('id');
    }

    /**
     * Calculer le prochain numéro de niveau pour un programme
     */
    public function getNextLevelNumber(int $programId): int
    {
        $maxLevel = ProgramLevel::where('program_id', $programId)->max('level_number');

        // Si aucun niveau n'existe, le prochain est 2 (niveau 1 = programme principal)
        return $maxLevel ? $maxLevel + 1 : 2;
    }

    /**
     * Obtenir l'historique des niveaux payés par un élève
     */
    public function getStudentLevelsHistory(int $studentId): Collection
    {
        return Order::where('student_id', $studentId)
            ->where('status', 'paid')
            ->with(['program', 'programLevel', 'class'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->groupBy('program_id')
            ->map(function ($orders) {
                return $orders->map(function ($order) {
                    return [
                        'order_id' => $order->id,
                        'program' => $order->program,
                        'level_number' => $order->level_number,
                        'level' => $order->programLevel,
                        'class' => $order->class,
                        'amount' => $order->total_amount,
                        'paid_at' => $order->created_at,
                    ];
                });
            });
    }

    /**
     * Vérifier si un élève peut s'inscrire à un niveau spécifique
     */
    public function canStudentEnrollToLevel(int $studentId, ProgramLevel $level): bool
    {
        // Le niveau doit avoir au moins une activation
        if (! $level->is_active) {
            return false;
        }

        // L'élève doit avoir le niveau précédent payé
        $currentLevel = $this->getStudentCurrentLevel($studentId, $level->program_id);
        $requiredLevel = $level->level_number - 1;

        return $currentLevel === $requiredLevel;
    }

    /**
     * Activer un niveau pour une ou plusieurs classes
     * Crée les activations et retourne les nouvelles activations créées
     */
    public function activateLevel(ProgramLevel $level, array $classIds, int $activatedBy): Collection
    {
        $newActivations = collect();

        foreach ($classIds as $classId) {
            $activation = ProgramLevelActivation::firstOrCreate(
                [
                    'program_level_id' => $level->id,
                    'class_id' => $classId,
                ],
                [
                    'activated_by' => $activatedBy,
                    'activated_at' => now(),
                ]
            );

            if ($activation->wasRecentlyCreated) {
                $newActivations->push($activation);
            }
        }

        return $newActivations;
    }

    /**
     * Désactiver un niveau
     * Si $classId est fourni, supprime uniquement cette activation
     * Sinon, supprime toutes les activations du niveau
     */
    public function deactivateLevel(ProgramLevel $level, ?int $classId = null): int
    {
        $query = ProgramLevelActivation::where('program_level_id', $level->id);

        if ($classId !== null) {
            $query->where('class_id', $classId);
        }

        return $query->delete();
    }

    /**
     * Obtenir les activations d'un niveau avec leurs classes chargées
     */
    public function getActivationsForLevel(ProgramLevel $level): Collection
    {
        return ProgramLevelActivation::where('program_level_id', $level->id)
            ->with(['class', 'activator'])
            ->get();
    }
}
