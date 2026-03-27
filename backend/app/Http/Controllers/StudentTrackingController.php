<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\TrackingForm;
use App\Models\TrackingFormAssignment;
use App\Models\TrackingFormResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StudentTrackingController extends Controller
{
    /**
     * Liste les formulaires assignés à l'élève connecté
     */
    public function index(Request $request): JsonResponse
    {
        $student = $request->user();

        $assignments = TrackingFormAssignment::with(['form.questions', 'form.creator', 'responses'])
            ->where('student_id', $student->id)
            ->whereHas('form', function ($query) {
                $query->where('is_active', true);
            })
            ->orderByRaw('completed_at IS NOT NULL') // Non complétés en premier
            ->orderBy('sent_at', 'desc')
            ->get();

        return response()->json([
            'assignments' => $assignments,
        ]);
    }

    /**
     * Affiche un formulaire spécifique à compléter
     */
    public function show(Request $request, TrackingForm $trackingForm): JsonResponse
    {
        $student = $request->user();

        $assignment = TrackingFormAssignment::with(['responses'])
            ->where('form_id', $trackingForm->id)
            ->where('student_id', $student->id)
            ->first();

        if (! $assignment) {
            return response()->json([
                'message' => 'Ce formulaire ne vous est pas assigné.',
            ], 403);
        }

        if (! $trackingForm->is_active) {
            return response()->json([
                'message' => 'Ce formulaire n\'est plus disponible.',
            ], 422);
        }

        $trackingForm->load('questions');

        return response()->json([
            'form' => $trackingForm,
            'assignment' => $assignment,
        ]);
    }

    /**
     * Soumet les réponses à un formulaire
     */
    public function submit(Request $request, TrackingForm $trackingForm): JsonResponse
    {
        $student = $request->user();

        $assignment = TrackingFormAssignment::where('form_id', $trackingForm->id)
            ->where('student_id', $student->id)
            ->first();

        if (! $assignment) {
            return response()->json([
                'message' => 'Ce formulaire ne vous est pas assigné.',
            ], 403);
        }

        if (! $trackingForm->is_active) {
            return response()->json([
                'message' => 'Ce formulaire n\'est plus disponible.',
            ], 422);
        }

        if ($assignment->completed_at) {
            return response()->json([
                'message' => 'Vous avez déjà complété ce formulaire.',
            ], 422);
        }

        $request->validate([
            'responses' => 'required|array',
            'responses.*.question_id' => 'required|exists:tracking_form_questions,id',
            'responses.*.answer' => 'nullable|string',
        ]);

        // Vérifier que toutes les questions requises ont une réponse
        $trackingForm->load('questions');
        $requiredQuestionIds = $trackingForm->questions
            ->where('required', true)
            ->pluck('id')
            ->toArray();

        $answeredQuestionIds = collect($request->responses)
            ->filter(fn ($r) => ! empty($r['answer']))
            ->pluck('question_id')
            ->toArray();

        $missingRequired = array_diff($requiredQuestionIds, $answeredQuestionIds);

        if (count($missingRequired) > 0) {
            return response()->json([
                'message' => 'Veuillez répondre à toutes les questions obligatoires.',
                'missing_questions' => $missingRequired,
            ], 422);
        }

        DB::beginTransaction();

        try {
            foreach ($request->responses as $responseData) {
                // Vérifier que la question appartient bien à ce formulaire
                $question = $trackingForm->questions->firstWhere('id', $responseData['question_id']);

                if (! $question) {
                    continue;
                }

                TrackingFormResponse::updateOrCreate(
                    [
                        'assignment_id' => $assignment->id,
                        'question_id' => $responseData['question_id'],
                    ],
                    [
                        'answer' => $responseData['answer'] ?? '',
                    ]
                );
            }

            // Marquer comme complété
            $assignment->update([
                'completed_at' => now(),
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Vos réponses ont été enregistrées avec succès.',
                'assignment' => $assignment->load('responses'),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Erreur lors de l\'enregistrement des réponses.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Nombre de formulaires en attente (non complétés)
     */
    public function pendingCount(Request $request): JsonResponse
    {
        $student = $request->user();

        $count = TrackingFormAssignment::where('student_id', $student->id)
            ->whereNull('completed_at')
            ->whereHas('form', fn ($q) => $q->where('is_active', true))
            ->count();

        return response()->json(['pending_count' => $count]);
    }

    /**
     * Historique des formulaires complétés par l'élève
     */
    public function history(Request $request): JsonResponse
    {
        $student = $request->user();

        $assignments = TrackingFormAssignment::with([
            'form.questions',
            'form.creator',
            'responses.question',
        ])
            ->where('student_id', $student->id)
            ->whereNotNull('completed_at')
            ->orderBy('completed_at', 'desc')
            ->get();

        return response()->json([
            'assignments' => $assignments,
        ]);
    }

    /**
     * Parcours de suivi d'un élève (pour admin - vue fiche élève)
     */
    public function studentTracking(Request $request, $studentId): JsonResponse
    {
        // Vérifier que l'utilisateur est admin ou teacher
        $user = $request->user();
        if (! in_array($user->role, ['admin', 'teacher'])) {
            return response()->json([
                'message' => 'Non autorisé.',
            ], 403);
        }

        $assignments = TrackingFormAssignment::with([
            'form.questions',
            'form.creator',
            'responses.question',
        ])
            ->where('student_id', $studentId)
            ->orderBy('sent_at', 'desc')
            ->get();

        return response()->json([
            'assignments' => $assignments,
        ]);
    }
}
