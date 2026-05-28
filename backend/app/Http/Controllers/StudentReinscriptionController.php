<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\ProgramLevel;
use App\Models\User;
use App\Services\ProgramLevelService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentReinscriptionController extends Controller
{
    public function __construct(
        private ProgramLevelService $levelService
    ) {}

    /**
     * Liste des réinscriptions disponibles pour l'élève connecté
     */
    public function index(Request $request): JsonResponse
    {
        $student = $request->user();
        $reinscriptions = $this->levelService->getAvailableReinscriptions($student->id);

        return response()->json([
            'reinscriptions' => $reinscriptions,
        ]);
    }

    /**
     * Historique des niveaux payés par l'élève connecté
     */
    public function history(Request $request): JsonResponse
    {
        $student = $request->user();
        $history = $this->levelService->getStudentLevelsHistory($student->id);

        return response()->json([
            'history' => $history,
        ]);
    }

    /**
     * Historique des niveaux d'un élève spécifique (pour admin)
     */
    public function studentHistory(User $student): JsonResponse
    {
        // Vérifier que c'est bien un élève
        if ($student->role !== 'student') {
            return response()->json([
                'message' => 'Cet utilisateur n\'est pas un élève.',
            ], 422);
        }

        $history = $this->levelService->getStudentLevelsHistory($student->id);

        return response()->json([
            'student' => $student->load('studentProfile'),
            'history' => $history,
        ]);
    }

    /**
     * Détails d'un niveau pour la réinscription élève (lecture seule).
     * Limité aux niveaux réellement activés (publiés).
     */
    public function showLevel(ProgramLevel $level): JsonResponse
    {
        $level->load(['teacher.teacherProfile', 'activations.class', 'program']);

        // Un élève ne peut consulter qu'un niveau activé pour au moins une classe
        if ($level->activations->isEmpty()) {
            return response()->json(['message' => 'Ce niveau n\'est pas disponible.'], 403);
        }

        return response()->json(['level' => $level]);
    }
}
