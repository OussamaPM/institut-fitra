<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\ProgramLevelRequest;
use App\Mail\LevelAvailableNotification;
use App\Models\Program;
use App\Models\ProgramLevel;
use App\Services\ProgramLevelService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class ProgramLevelController extends Controller
{
    public function __construct(
        private ProgramLevelService $levelService
    ) {}

    /**
     * Liste des niveaux d'un programme
     */
    public function index(Program $program): JsonResponse
    {
        $levels = $program->levels()
            ->with(['teacher.teacherProfile', 'activations.class'])
            ->get()
            ->map(function ($level) {
                return [
                    ...$level->toArray(),
                    'is_active' => $level->is_active,
                    'has_enrollments' => $level->has_enrollments,
                    'enrollments_count' => $level->enrollments_count,
                ];
            });

        return response()->json([
            'levels' => $levels,
            'program' => $program->load('teacher.teacherProfile', 'defaultClass'),
        ]);
    }

    /**
     * Créer un nouveau niveau pour un programme
     */
    public function store(ProgramLevelRequest $request, Program $program): JsonResponse
    {
        // Calculer automatiquement le numéro de niveau
        $levelNumber = $this->levelService->getNextLevelNumber($program->id);

        $level = DB::transaction(function () use ($request, $program, $levelNumber) {
            return ProgramLevel::create([
                'program_id' => $program->id,
                'level_number' => $levelNumber,
                'name' => $request->name,
                'description' => $request->description,
                'price' => $request->price,
                'max_installments' => $request->max_installments,
                'schedule' => $request->schedule,
                'teacher_id' => $request->teacher_id,
            ]);
        });

        $level->load(['teacher.teacherProfile', 'activations.class', 'program']);

        return response()->json([
            'message' => "Niveau {$levelNumber} créé avec succès.",
            'level' => [
                ...$level->toArray(),
                'is_active' => false,
                'has_enrollments' => false,
                'enrollments_count' => 0,
            ],
        ], 201);
    }

    /**
     * Afficher un niveau spécifique
     */
    public function show(Program $program, ProgramLevel $level): JsonResponse
    {
        if ($level->program_id !== $program->id) {
            return response()->json(['message' => 'Niveau non trouvé.'], 404);
        }

        $level->load(['teacher.teacherProfile', 'activations.class', 'program']);

        return response()->json([
            'level' => [
                ...$level->toArray(),
                'is_active' => $level->is_active,
                'has_enrollments' => $level->has_enrollments,
                'enrollments_count' => $level->enrollments_count,
            ],
        ]);
    }

    /**
     * Modifier un niveau
     */
    public function update(ProgramLevelRequest $request, Program $program, ProgramLevel $level): JsonResponse
    {
        if ($level->program_id !== $program->id) {
            return response()->json(['message' => 'Niveau non trouvé.'], 404);
        }

        $level->update([
            'name' => $request->name,
            'description' => $request->description,
            'price' => $request->price,
            'max_installments' => $request->max_installments,
            'schedule' => $request->schedule,
            'teacher_id' => $request->teacher_id,
        ]);

        $level->load(['teacher.teacherProfile', 'activations.class', 'program']);

        return response()->json([
            'message' => 'Niveau modifié avec succès.',
            'level' => [
                ...$level->toArray(),
                'is_active' => $level->is_active,
                'has_enrollments' => $level->has_enrollments,
                'enrollments_count' => $level->enrollments_count,
            ],
        ]);
    }

    /**
     * Supprimer un niveau
     */
    public function destroy(Program $program, ProgramLevel $level): JsonResponse
    {
        if ($level->program_id !== $program->id) {
            return response()->json(['message' => 'Niveau non trouvé.'], 404);
        }

        if (! $this->levelService->canDeleteLevel($level)) {
            return response()->json([
                'message' => 'Impossible de supprimer ce niveau car des élèves y sont inscrits.',
            ], 422);
        }

        $levelNumber = $level->level_number;
        $level->delete();

        return response()->json([
            'message' => "Niveau {$levelNumber} supprimé avec succès.",
        ]);
    }

    /**
     * Activer un niveau pour une ou plusieurs classes
     * Envoie des emails aux élèves éligibles de chaque classe
     */
    public function activate(Request $request, Program $program, ProgramLevel $level): JsonResponse
    {
        if ($level->program_id !== $program->id) {
            return response()->json(['message' => 'Niveau non trouvé.'], 404);
        }

        $request->validate([
            'class_ids' => 'required|array|min:1',
            'class_ids.*' => 'integer|exists:classes,id',
            'confirmed' => 'boolean',
        ]);

        $classIds = $request->input('class_ids');

        // Calculer le nombre total d'élèves éligibles à notifier
        $totalEligible = 0;
        foreach ($classIds as $classId) {
            $totalEligible += $this->levelService
                ->getEligibleStudentsForNotification($level, $classId)
                ->count();
        }

        // Demander confirmation si des élèves vont être notifiés
        if (! $request->boolean('confirmed') && $totalEligible > 0) {
            return response()->json([
                'requires_confirmation' => true,
                'eligible_students_count' => $totalEligible,
                'message' => "{$totalEligible} élève(s) seront notifié(s) par email.",
            ]);
        }

        // Créer les activations
        $newActivations = $this->levelService->activateLevel($level, $classIds, auth()->id());

        // Charger les relations pour les emails
        $level->load(['program', 'teacher']);

        // Envoyer les emails par classe (uniquement pour les nouvelles activations)
        $emailsSent = 0;
        foreach ($newActivations as $activation) {
            $activation->load('class');
            $students = $this->levelService->getEligibleStudentsForNotification($level, $activation->class_id);

            foreach ($students as $student) {
                Mail::to($student->email)->queue(
                    new LevelAvailableNotification($level, $student, $activation->class)
                );
                $emailsSent++;
            }
        }

        $level->load(['teacher.teacherProfile', 'activations.class', 'program']);

        return response()->json([
            'message' => "Niveau activé pour " . count($classIds) . " classe(s). {$emailsSent} email(s) envoyé(s).",
            'emails_sent' => $emailsSent,
            'level' => [
                ...$level->toArray(),
                'is_active' => $level->is_active,
                'has_enrollments' => $level->has_enrollments,
                'enrollments_count' => $level->enrollments_count,
            ],
        ]);
    }

    /**
     * Désactiver un niveau (tout ou pour une classe spécifique)
     */
    public function deactivate(Request $request, Program $program, ProgramLevel $level): JsonResponse
    {
        if ($level->program_id !== $program->id) {
            return response()->json(['message' => 'Niveau non trouvé.'], 404);
        }

        $request->validate([
            'class_id' => 'nullable|integer|exists:classes,id',
        ]);

        $classId = $request->input('class_id');
        $deleted = $this->levelService->deactivateLevel($level, $classId);

        $message = $classId
            ? 'Niveau désactivé pour cette classe.'
            : "Niveau désactivé pour toutes les classes ({$deleted} activation(s) supprimée(s)).";

        $level->load(['teacher.teacherProfile', 'activations.class', 'program']);

        return response()->json([
            'message' => $message,
            'level' => [
                ...$level->toArray(),
                'is_active' => $level->is_active,
                'has_enrollments' => $level->has_enrollments,
                'enrollments_count' => $level->enrollments_count,
            ],
        ]);
    }
}
