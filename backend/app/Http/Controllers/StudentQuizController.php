<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Quiz;
use App\Models\QuizAnswer;
use App\Models\QuizSubmission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StudentQuizController extends Controller
{
    /**
     * Liste tous les quiz disponibles pour les classes de l'élève
     */
    public function index(Request $request): JsonResponse
    {
        $student = $request->user();

        $classIds = $student->enrollments()
            ->where('status', 'active')
            ->pluck('class_id');

        $quizzes = Quiz::whereIn('class_id', $classIds)
            ->with(['session', 'class.program'])
            ->withExists(['submissions as submitted' => function ($query) use ($student): void {
                $query->where('student_id', $student->id);
            }])
            ->get();

        return response()->json(['quizzes' => $quizzes]);
    }

    /**
     * Détails d'un quiz (sans les bonnes réponses) + statut soumission
     */
    public function show(Request $request, Quiz $quiz): JsonResponse
    {
        $student = $request->user();

        $enrolled = $student->enrollments()
            ->where('class_id', $quiz->class_id)
            ->where('status', 'active')
            ->exists();

        if (! $enrolled) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        $submission = QuizSubmission::where('quiz_id', $quiz->id)
            ->where('student_id', $student->id)
            ->first();

        // Charger les questions sans exposer is_correct ni le détail de la réponse aux élèves
        $quiz->load(['questions' => function ($query): void {
            $query->select('id', 'quiz_id', 'question_text', 'type', 'order')
                ->with(['options' => function ($q): void {
                    $q->select('id', 'question_id', 'option_text', 'order');
                }]);
        }]);

        return response()->json([
            'quiz' => $quiz,
            'submitted' => $submission !== null,
            'submitted_at' => $submission?->submitted_at,
        ]);
    }

    /**
     * Soumet les réponses d'un élève (une seule tentative)
     */
    public function submit(Request $request, Quiz $quiz): JsonResponse
    {
        $student = $request->user();

        $enrolled = $student->enrollments()
            ->where('class_id', $quiz->class_id)
            ->where('status', 'active')
            ->exists();

        if (! $enrolled) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        if (QuizSubmission::where('quiz_id', $quiz->id)->where('student_id', $student->id)->exists()) {
            return response()->json(['message' => 'Vous avez déjà soumis ce quiz.'], 422);
        }

        $request->validate([
            'answers' => 'required|array',
            'answers.*.question_id' => 'required|exists:quiz_questions,id',
            'answers.*.selected_option_id' => 'nullable|exists:quiz_options,id',
            'answers.*.free_text_answer' => 'nullable|string|max:2000',
        ]);

        DB::beginTransaction();

        try {
            $submission = QuizSubmission::create([
                'quiz_id' => $quiz->id,
                'student_id' => $student->id,
                'submitted_at' => now(),
            ]);

            $questions = $quiz->questions()->with('options')->get()->keyBy('id');

            foreach ($request->answers as $answerData) {
                $question = $questions->get($answerData['question_id']);
                if (! $question) {
                    continue;
                }

                $isCorrect = null;
                if ($question->type === 'multiple_choice' && ! empty($answerData['selected_option_id'])) {
                    $option = $question->options->firstWhere('id', $answerData['selected_option_id']);
                    $isCorrect = $option?->is_correct ?? false;
                }

                QuizAnswer::create([
                    'submission_id' => $submission->id,
                    'question_id' => $answerData['question_id'],
                    'selected_option_id' => $answerData['selected_option_id'] ?? null,
                    'free_text_answer' => $answerData['free_text_answer'] ?? null,
                    'is_correct' => $isCorrect,
                ]);
            }

            DB::commit();

            $score = $submission->score;

            return response()->json([
                'message' => 'Quiz soumis avec succès.',
                'submission_id' => $submission->id,
                'score' => $score,
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Erreur lors de la soumission.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Révision du quiz après soumission (avec bonnes réponses)
     */
    public function review(Request $request, Quiz $quiz): JsonResponse
    {
        $student = $request->user();

        $submission = QuizSubmission::where('quiz_id', $quiz->id)
            ->where('student_id', $student->id)
            ->firstOrFail();

        $quiz->load(['questions.options', 'session', 'class.program']);

        $submission->load([
            'answers.question.options',
            'answers.selectedOption',
        ]);

        $score = $submission->score;

        return response()->json([
            'quiz' => $quiz,
            'submission' => $submission,
            'score' => $score,
        ]);
    }
}
