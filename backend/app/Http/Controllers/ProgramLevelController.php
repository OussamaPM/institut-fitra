<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\ProgramLevelRequest;
use App\Mail\LevelAvailableNotification;
use App\Models\ClassModel;
use App\Models\Program;
use App\Models\ProgramLevel;
use App\Models\ProgramLevelActivation;
use App\Services\ProgramLevelService;
use App\Services\SessionGeneratorService;
use Carbon\Carbon;
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
     * Activer un niveau pour une classe, sur une période donnée.
     * Génère les sessions du niveau et notifie les élèves éligibles.
     */
    public function activate(Request $request, Program $program, ProgramLevel $level): JsonResponse
    {
        if ($level->program_id !== $program->id) {
            return response()->json(['message' => 'Niveau non trouvé.'], 404);
        }

        $request->validate([
            'class_id' => 'required|integer|exists:classes,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'confirmed' => 'boolean',
        ]);

        // Un niveau sans emploi du temps ne peut pas générer de sessions
        if (! $level->schedule || count($level->schedule) === 0) {
            return response()->json([
                'message' => 'Ce niveau n\'a pas d\'emploi du temps défini. Ajoutez les jours et horaires avant de l\'activer.',
            ], 422);
        }

        $classId = (int) $request->input('class_id');
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        // Demander confirmation si des élèves vont être notifiés
        $eligibleStudents = $this->levelService->getEligibleStudentsForNotification($level, $classId);
        if (! $request->boolean('confirmed') && $eligibleStudents->count() > 0) {
            return response()->json([
                'requires_confirmation' => true,
                'eligible_students_count' => $eligibleStudents->count(),
                'message' => "{$eligibleStudents->count()} élève(s) seront notifié(s) par email.",
            ]);
        }

        $class = ClassModel::findOrFail($classId);

        $result = DB::transaction(function () use ($level, $classId, $startDate, $endDate, $class) {
            $activation = $this->levelService->activateLevelForClass(
                $level,
                $classId,
                auth()->id(),
                $startDate,
                $endDate
            );

            // (Re)générer les sessions de ce niveau pour cette classe sur la période
            $sessionGenerator = new SessionGeneratorService;
            $sessionGenerator->deleteLevelSessions($class, $level);
            $sessions = $sessionGenerator->generateSessionsForLevelActivation(
                $class,
                $level,
                Carbon::parse($startDate),
                Carbon::parse($endDate)
            );

            return [
                'was_new' => $activation->wasRecentlyCreated,
                'sessions_count' => $sessions->count(),
            ];
        });

        // Emails uniquement lors de la première activation pour cette classe
        $emailsSent = 0;
        if ($result['was_new']) {
            $level->load(['program', 'teacher']);
            foreach ($eligibleStudents as $student) {
                Mail::to($student->email)->queue(
                    new LevelAvailableNotification($level, $student, $class)
                );
                $emailsSent++;
            }
        }

        $level->load(['teacher.teacherProfile', 'activations.class', 'program']);

        $message = "Niveau activé pour la classe. {$result['sessions_count']} session(s) générée(s)";
        $message .= $emailsSent > 0 ? ", {$emailsSent} email(s) envoyé(s)." : '.';

        return response()->json([
            'message' => $message,
            'emails_sent' => $emailsSent,
            'sessions_count' => $result['sessions_count'],
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

        // Classes concernées AVANT suppression des activations (pour nettoyer leurs sessions)
        $affectedClassIds = ProgramLevelActivation::where('program_level_id', $level->id)
            ->when($classId !== null, fn ($q) => $q->where('class_id', $classId))
            ->pluck('class_id');

        $deleted = $this->levelService->deactivateLevel($level, $classId);

        // Supprimer les sessions générées de ce niveau pour les classes désactivées
        $sessionGenerator = new SessionGeneratorService;
        foreach ($affectedClassIds as $affectedClassId) {
            $class = ClassModel::find($affectedClassId);
            if ($class) {
                $sessionGenerator->deleteLevelSessions($class, $level);
            }
        }

        $message = $classId
            ? 'Niveau désactivé pour cette classe (sessions supprimées).'
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
