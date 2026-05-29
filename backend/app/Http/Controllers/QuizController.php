<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\ClassModel;
use App\Models\Notification;
use App\Models\Quiz;
use App\Models\QuizAnswer;
use App\Models\QuizOption;
use App\Models\QuizQuestion;
use App\Models\QuizSubmission;
use App\Models\Session;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QuizController extends Controller
{
    /**
     * Récupère le quiz d'une session/classe (ou null)
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'session_id' => 'required|exists:class_sessions,id',
            'class_id' => 'required|exists:classes,id',
        ]);

        $quiz = Quiz::with(['questions.options'])
            ->where('session_id', $request->session_id)
            ->where('class_id', $request->class_id)
            ->first();

        if ($quiz) {
            $quiz->loadCount('submissions');
        }

        return response()->json(['quiz' => $quiz]);
    }

    /**
     * Crée un quiz pour une session/classe
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'session_id' => 'required|exists:class_sessions,id',
            'class_id' => 'required|exists:classes,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'questions' => 'required|array|min:1',
            'questions.*.question_text' => 'required|string',
            'questions.*.type' => 'required|in:multiple_choice,free_text',
            'questions.*.answer_explanation' => 'nullable|string',
            'questions.*.options' => 'required_if:questions.*.type,multiple_choice|array|min:2',
            'questions.*.options.*.option_text' => 'required_with:questions.*.options|string',
            'questions.*.options.*.is_correct' => 'required_with:questions.*.options|boolean',
        ]);

        if (Quiz::where('session_id', $request->session_id)->where('class_id', $request->class_id)->exists()) {
            return response()->json(['message' => 'Un quiz existe déjà pour cette session et cette classe.'], 422);
        }

        DB::beginTransaction();

        try {
            $quiz = Quiz::create([
                'session_id' => $request->session_id,
                'class_id' => $request->class_id,
                'title' => $request->title,
                'description' => $request->description,
                'created_by' => $request->user()->id,
            ]);

            foreach ($request->questions as $index => $questionData) {
                $question = QuizQuestion::create([
                    'quiz_id' => $quiz->id,
                    'question_text' => $questionData['question_text'],
                    'type' => $questionData['type'],
                    'answer_explanation' => $questionData['answer_explanation'] ?? null,
                    'order' => $index,
                ]);

                if ($questionData['type'] === 'multiple_choice' && isset($questionData['options'])) {
                    foreach ($questionData['options'] as $optIndex => $optionData) {
                        QuizOption::create([
                            'question_id' => $question->id,
                            'option_text' => $optionData['option_text'],
                            'is_correct' => $optionData['is_correct'],
                            'order' => $optIndex,
                        ]);
                    }
                }
            }

            // Notifier les élèves inscrits à la classe
            $class = ClassModel::with('students')->find($request->class_id);
            $session = Session::find($request->session_id);

            if ($class && $session) {
                foreach ($class->students as $student) {
                    Notification::create([
                        'user_id' => $student->id,
                        'type' => 'quiz',
                        'title' => 'Nouveau quiz disponible',
                        'message' => "Un quiz a été ajouté pour la session \"{$session->title}\" : \"{$quiz->title}\".",
                        'action_url' => '/student/supports',
                    ]);
                }
            }

            DB::commit();

            $quiz->load('questions.options');
            $quiz->loadCount('submissions');

            return response()->json([
                'message' => 'Quiz créé avec succès.',
                'quiz' => $quiz,
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Erreur lors de la création du quiz.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Met à jour un quiz (questions seulement si aucune soumission)
     */
    public function update(Request $request, Quiz $quiz): JsonResponse
    {
        if ($quiz->submissions()->exists() && $request->has('questions')) {
            return response()->json([
                'message' => 'Impossible de modifier les questions car des élèves ont déjà soumis ce quiz.',
            ], 422);
        }

        $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'questions' => 'sometimes|array|min:1',
            'questions.*.question_text' => 'required|string',
            'questions.*.type' => 'required|in:multiple_choice,free_text',
            'questions.*.answer_explanation' => 'nullable|string',
            'questions.*.options' => 'required_if:questions.*.type,multiple_choice|array|min:2',
            'questions.*.options.*.option_text' => 'required_with:questions.*.options|string',
            'questions.*.options.*.is_correct' => 'required_with:questions.*.options|boolean',
        ]);

        DB::beginTransaction();

        try {
            $quiz->update($request->only(['title', 'description']));

            if ($request->has('questions')) {
                $quiz->questions()->delete();

                foreach ($request->questions as $index => $questionData) {
                    $question = QuizQuestion::create([
                        'quiz_id' => $quiz->id,
                        'question_text' => $questionData['question_text'],
                        'type' => $questionData['type'],
                        'order' => $index,
                    ]);

                    if ($questionData['type'] === 'multiple_choice' && isset($questionData['options'])) {
                        foreach ($questionData['options'] as $optIndex => $optionData) {
                            QuizOption::create([
                                'question_id' => $question->id,
                                'option_text' => $optionData['option_text'],
                                'is_correct' => $optionData['is_correct'],
                                'order' => $optIndex,
                            ]);
                        }
                    }
                }
            }

            DB::commit();

            $quiz->load('questions.options');
            $quiz->loadCount('submissions');

            return response()->json([
                'message' => 'Quiz mis à jour avec succès.',
                'quiz' => $quiz,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Erreur lors de la mise à jour du quiz.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Supprime un quiz (cascade : questions, options, soumissions, réponses)
     */
    public function destroy(Quiz $quiz): JsonResponse
    {
        $quiz->delete();

        return response()->json(['message' => 'Quiz supprimé avec succès.']);
    }

    /**
     * Résultats du quiz : liste des soumissions avec scores
     */
    public function results(Quiz $quiz): JsonResponse
    {
        $quiz->load(['questions.options', 'session', 'class.program']);

        $submissions = QuizSubmission::with([
            'student.studentProfile',
            'answers.selectedOption',
            'answers.question',
        ])
            ->where('quiz_id', $quiz->id)
            ->orderBy('submitted_at', 'desc')
            ->get();

        $submissions->each(function (QuizSubmission $submission): void {
            $submission->append('score');
        });

        return response()->json([
            'quiz' => $quiz,
            'submissions' => $submissions,
            'submissions_count' => $submissions->count(),
        ]);
    }
}
