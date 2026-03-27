<?php

namespace App\Http\Controllers;

use App\Http\Requests\ClassRequest;
use App\Models\ClassModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ClassController extends Controller
{
    /**
     * Display a listing of classes.
     * Admin: toutes les classes
     * Teacher: uniquement ses classes (programmes créés par lui)
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = ClassModel::with(['program.teacher.teacherProfile', 'program.creator.teacherProfile', 'parentClass', 'childClasses'])
                ->withCount(['enrollments as enrolled_students' => fn ($q) => $q->where('status', 'active')]);

            // Filtre par programme
            if ($request->has('program_id')) {
                $query->where('program_id', $request->program_id);
            }

            // Filtre par année académique
            if ($request->has('academic_year')) {
                $query->where('academic_year', $request->academic_year);
            }

            // Filtre par statut
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            // Si teacher : uniquement ses programmes
            if ($request->user()->role === 'teacher') {
                $query->whereHas('program', function ($q) use ($request) {
                    $q->where('created_by', $request->user()->id);
                });
            }

            $classes = $query->orderBy('academic_year', 'desc')
                ->orderBy('start_date', 'desc')
                ->paginate(15);

            return response()->json($classes);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération des classes: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la récupération des classes.',
            ], 500);
        }
    }

    /**
     * Store a newly created class in storage.
     * Génère automatiquement les sessions selon le planning du programme.
     */
    public function store(ClassRequest $request): JsonResponse
    {
        try {
            // Vérifier que l'utilisateur a accès au programme
            $program = \App\Models\Program::findOrFail($request->program_id);

            if ($request->user()->role === 'teacher' && $program->created_by !== $request->user()->id) {
                return response()->json([
                    'message' => 'Vous n\'êtes pas autorisé à créer une classe pour ce programme.',
                ], 403);
            }

            $class = ClassModel::create($request->validated());

            // Générer automatiquement les sessions
            try {
                $sessionGenerator = new \App\Services\SessionGeneratorService;
                $sessions = $sessionGenerator->generateSessionsForClass($class);

                Log::info("Classe créée avec {$sessions->count()} sessions générées automatiquement.", [
                    'class_id' => $class->id,
                    'class_name' => $class->name,
                ]);

                return response()->json([
                    'message' => "Classe créée avec succès. {$sessions->count()} session(s) générée(s) automatiquement.",
                    'class' => $class->load('program'),
                    'sessions_count' => $sessions->count(),
                ], 201);
            } catch (\Exception $sessionError) {
                // Si la génération de sessions échoue, on garde quand même la classe
                Log::warning('Classe créée mais erreur lors de la génération automatique des sessions: '.$sessionError->getMessage(), [
                    'class_id' => $class->id,
                ]);

                return response()->json([
                    'message' => 'Classe créée avec succès, mais erreur lors de la génération automatique des sessions. Vous pouvez les générer manuellement.',
                    'class' => $class->load('program'),
                    'warning' => $sessionError->getMessage(),
                ], 201);
            }
        } catch (\Exception $e) {
            Log::error('Erreur lors de la création de la classe: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la création de la classe.',
            ], 500);
        }
    }

    /**
     * Display the specified class.
     */
    public function show(ClassModel $class): JsonResponse
    {
        try {
            // Vérifier l'autorisation
            if (request()->user()->role === 'teacher' && $class->program->created_by !== request()->user()->id) {
                return response()->json([
                    'message' => 'Vous n\'êtes pas autorisé à consulter cette classe.',
                ], 403);
            }

            $class->load([
                'program.teacher.teacherProfile',
                'enrollments.student.studentProfile',
                'parentClass',
                'childClasses',
                'sessions' => function ($query) {
                    $query->orderBy('scheduled_at', 'desc')->limit(10);
                },
            ]);

            // Ajouter des statistiques
            $class->statistics = [
                'enrolled_students' => $class->enrolled_students_count,
                'remaining_capacity' => $class->remaining_capacity,
                'total_sessions' => $class->sessions()->count(),
                'completed_sessions' => $class->sessions()->where('status', 'completed')->count(),
            ];

            return response()->json(['class' => $class]);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération de la classe: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la récupération de la classe.',
            ], 500);
        }
    }

    /**
     * Update the specified class in storage.
     * Si les dates changent, les sessions sont automatiquement régénérées.
     */
    public function update(ClassRequest $request, ClassModel $class): JsonResponse
    {
        try {
            // Vérifier l'autorisation
            if ($request->user()->role === 'teacher' && $class->program->created_by !== $request->user()->id) {
                return response()->json([
                    'message' => 'Vous n\'êtes pas autorisé à modifier cette classe.',
                ], 403);
            }

            // Vérifier si les dates ont changé
            $oldStartDate = $class->start_date;
            $oldEndDate = $class->end_date;
            $oldProgramId = $class->program_id;

            $class->update($request->validated());

            // Régénérer les sessions si les dates ou le programme ont changé
            $datesChanged = (
                $class->start_date != $oldStartDate ||
                $class->end_date != $oldEndDate ||
                $class->program_id != $oldProgramId
            );

            $sessionsCount = 0;
            $sessionsRegenerated = false;

            if ($datesChanged) {
                try {
                    $sessionGenerator = new \App\Services\SessionGeneratorService;
                    $sessions = $sessionGenerator->regenerateSessionsForClass($class);
                    $sessionsCount = $sessions->count();
                    $sessionsRegenerated = true;

                    Log::info("Classe modifiée avec {$sessionsCount} sessions régénérées automatiquement.", [
                        'class_id' => $class->id,
                        'old_dates' => ['start' => $oldStartDate, 'end' => $oldEndDate],
                        'new_dates' => ['start' => $class->start_date, 'end' => $class->end_date],
                    ]);
                } catch (\Exception $sessionError) {
                    Log::warning('Classe modifiée mais erreur lors de la régénération des sessions: '.$sessionError->getMessage());
                }
            }

            $message = 'Classe modifiée avec succès.';
            if ($sessionsRegenerated) {
                $message .= " {$sessionsCount} session(s) régénérée(s) automatiquement.";
            }

            return response()->json([
                'message' => $message,
                'class' => $class->load('program'),
                'sessions_regenerated' => $sessionsRegenerated,
                'sessions_count' => $sessionsCount,
            ]);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la modification de la classe: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la modification de la classe.',
            ], 500);
        }
    }

    /**
     * Remove the specified class from storage.
     */
    public function destroy(ClassModel $class): JsonResponse
    {
        try {
            // Vérifier l'autorisation
            if (request()->user()->role === 'teacher' && $class->program->created_by !== request()->user()->id) {
                return response()->json([
                    'message' => 'Vous n\'êtes pas autorisé à supprimer cette classe.',
                ], 403);
            }

            // Vérifier s'il y a des inscriptions actives
            $activeEnrollments = $class->enrollments()->where('status', 'active')->count();
            if ($activeEnrollments > 0) {
                return response()->json([
                    'message' => 'Impossible de supprimer cette classe car des élèves y sont encore inscrits.',
                ], 422);
            }

            $class->delete();

            return response()->json([
                'message' => 'Classe supprimée avec succès.',
            ]);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la suppression de la classe: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la suppression de la classe.',
            ], 500);
        }
    }

    /**
     * Get students enrolled in a specific class.
     */
    public function students(ClassModel $class): JsonResponse
    {
        try {
            // Vérifier l'autorisation
            if (request()->user()->role === 'teacher' && $class->program->created_by !== request()->user()->id) {
                return response()->json([
                    'message' => 'Vous n\'êtes pas autorisé à consulter les élèves de cette classe.',
                ], 403);
            }

            $enrollments = $class->enrollments()
                ->with('student.studentProfile')
                ->where('status', 'active')
                ->get();

            $students = $enrollments->map(function ($enrollment) {
                return [
                    'id' => $enrollment->student->id,
                    'email' => $enrollment->student->email,
                    'first_name' => $enrollment->student->first_name,
                    'last_name' => $enrollment->student->last_name,
                    'student_profile' => $enrollment->student->studentProfile,
                    'enrollment_status' => $enrollment->status,
                    'enrolled_at' => $enrollment->enrolled_at,
                ];
            });

            return response()->json(['students' => $students]);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération des élèves: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la récupération des élèves.',
            ], 500);
        }
    }

    /**
     * Generate all sessions for a class based on program schedule.
     */
    public function generateSessions(Request $request, ClassModel $class): JsonResponse
    {
        try {
            // Vérifier l'autorisation
            if ($request->user()->role === 'teacher' && $class->program->created_by !== $request->user()->id) {
                return response()->json([
                    'message' => 'Vous n\'êtes pas autorisé à générer des sessions pour cette classe.',
                ], 403);
            }

            $sessionGenerator = new \App\Services\SessionGeneratorService;
            $sessions = $sessionGenerator->generateSessionsForClass($class);

            return response()->json([
                'message' => "Sessions générées avec succès ({$sessions->count()} sessions créées).",
                'sessions' => $sessions,
            ], 201);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la génération des sessions: '.$e->getMessage());

            return response()->json([
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Regenerate all sessions for a class (delete upcoming ones and recreate).
     */
    public function regenerateSessions(Request $request, ClassModel $class): JsonResponse
    {
        try {
            // Vérifier l'autorisation
            if ($request->user()->role === 'teacher' && $class->program->created_by !== $request->user()->id) {
                return response()->json([
                    'message' => 'Vous n\'êtes pas autorisé à régénérer les sessions de cette classe.',
                ], 403);
            }

            $sessionGenerator = new \App\Services\SessionGeneratorService;
            $sessions = $sessionGenerator->regenerateSessionsForClass($class);

            return response()->json([
                'message' => "Sessions régénérées avec succès ({$sessions->count()} sessions créées).",
                'sessions' => $sessions,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la régénération des sessions: '.$e->getMessage());

            return response()->json([
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
