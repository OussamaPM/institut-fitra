<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\ClassModel;
use App\Models\Notification;
use App\Models\TrackingForm;
use App\Models\TrackingFormAssignment;
use App\Models\TrackingFormQuestion;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TrackingFormController extends Controller
{
    /**
     * Liste tous les formulaires de suivi (admin)
     */
    public function index(Request $request): JsonResponse
    {
        $query = TrackingForm::with(['creator', 'questions'])
            ->withCount([
                'assignments',
                'assignments as completed_count' => function ($query) {
                    $query->whereNotNull('completed_at');
                },
                'assignments as pending_count' => function ($query) {
                    $query->whereNull('completed_at');
                },
            ])
            ->orderBy('created_at', 'desc');

        // Filtre par statut actif/inactif
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $forms = $query->paginate($request->get('per_page', 15));

        return response()->json([
            'forms' => $forms,
        ]);
    }

    /**
     * Affiche un formulaire spécifique avec ses statistiques
     */
    public function show(TrackingForm $trackingForm): JsonResponse
    {
        $trackingForm->load([
            'creator',
            'questions',
            'assignments.student.studentProfile',
            'assignments.responses',
        ]);

        $trackingForm->loadCount([
            'assignments',
            'assignments as completed_count' => function ($query) {
                $query->whereNotNull('completed_at');
            },
            'assignments as pending_count' => function ($query) {
                $query->whereNull('completed_at');
            },
        ]);

        return response()->json([
            'form' => $trackingForm,
        ]);
    }

    /**
     * Crée un nouveau formulaire de suivi
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'questions' => 'required|array|min:1',
            'questions.*.question' => 'required|string',
            'questions.*.type' => 'required|in:text,multiple_choice',
            'questions.*.options' => 'required_if:questions.*.type,multiple_choice|array',
            'questions.*.required' => 'boolean',
        ]);

        DB::beginTransaction();

        try {
            $form = TrackingForm::create([
                'title' => $request->title,
                'description' => $request->description,
                'created_by' => $request->user()->id,
                'is_active' => true,
            ]);

            foreach ($request->questions as $index => $questionData) {
                TrackingFormQuestion::create([
                    'form_id' => $form->id,
                    'question' => $questionData['question'],
                    'type' => $questionData['type'],
                    'options' => $questionData['type'] === 'multiple_choice' ? $questionData['options'] : null,
                    'order' => $index,
                    'required' => $questionData['required'] ?? true,
                ]);
            }

            DB::commit();

            $form->load('questions');

            return response()->json([
                'message' => 'Formulaire créé avec succès.',
                'form' => $form,
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Erreur lors de la création du formulaire.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Met à jour un formulaire (titre, description, questions)
     */
    public function update(Request $request, TrackingForm $trackingForm): JsonResponse
    {
        $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'questions' => 'sometimes|array|min:1',
            'questions.*.question' => 'required|string',
            'questions.*.type' => 'required|in:text,multiple_choice',
            'questions.*.options' => 'required_if:questions.*.type,multiple_choice|array',
            'questions.*.required' => 'boolean',
        ]);

        // Ne pas permettre la modification si des réponses existent
        $hasResponses = TrackingFormAssignment::where('form_id', $trackingForm->id)
            ->whereNotNull('completed_at')
            ->exists();

        if ($hasResponses && $request->has('questions')) {
            return response()->json([
                'message' => 'Impossible de modifier les questions car des réponses ont déjà été soumises.',
            ], 422);
        }

        DB::beginTransaction();

        try {
            $trackingForm->update($request->only(['title', 'description']));

            if ($request->has('questions')) {
                // Supprimer les anciennes questions
                $trackingForm->questions()->delete();

                // Créer les nouvelles
                foreach ($request->questions as $index => $questionData) {
                    TrackingFormQuestion::create([
                        'form_id' => $trackingForm->id,
                        'question' => $questionData['question'],
                        'type' => $questionData['type'],
                        'options' => $questionData['type'] === 'multiple_choice' ? $questionData['options'] : null,
                        'order' => $index,
                        'required' => $questionData['required'] ?? true,
                    ]);
                }
            }

            DB::commit();

            $trackingForm->load('questions');

            return response()->json([
                'message' => 'Formulaire mis à jour avec succès.',
                'form' => $trackingForm,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Erreur lors de la mise à jour du formulaire.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Supprime un formulaire
     */
    public function destroy(TrackingForm $trackingForm): JsonResponse
    {
        $trackingForm->delete();

        return response()->json([
            'message' => 'Formulaire supprimé avec succès.',
        ]);
    }

    /**
     * Active/Désactive un formulaire
     */
    public function toggleActive(TrackingForm $trackingForm): JsonResponse
    {
        $trackingForm->update([
            'is_active' => ! $trackingForm->is_active,
        ]);

        return response()->json([
            'message' => $trackingForm->is_active
                ? 'Formulaire activé avec succès.'
                : 'Formulaire désactivé avec succès.',
            'form' => $trackingForm,
        ]);
    }

    /**
     * Envoie le formulaire à des élèves (assignation)
     */
    public function assign(Request $request, TrackingForm $trackingForm): JsonResponse
    {
        $request->validate([
            'student_ids' => 'required_without:class_id|array',
            'student_ids.*' => 'exists:users,id',
            'class_id' => 'required_without:student_ids|exists:classes,id',
        ]);

        if (! $trackingForm->is_active) {
            return response()->json([
                'message' => 'Ce formulaire est désactivé et ne peut pas être envoyé.',
            ], 422);
        }

        $studentIds = [];

        // Si une classe est sélectionnée, récupérer tous les élèves de cette classe
        if ($request->has('class_id')) {
            $class = ClassModel::with('students')->findOrFail($request->class_id);
            $studentIds = $class->students->pluck('id')->toArray();
        }

        // Si des élèves spécifiques sont sélectionnés
        if ($request->has('student_ids')) {
            $studentIds = array_merge($studentIds, $request->student_ids);
        }

        // Retirer les doublons
        $studentIds = array_unique($studentIds);

        // Vérifier que ce sont bien des élèves
        $validStudentIds = User::whereIn('id', $studentIds)
            ->where('role', 'student')
            ->pluck('id')
            ->toArray();

        $assignedCount = 0;
        $alreadyAssignedCount = 0;

        foreach ($validStudentIds as $studentId) {
            // Vérifier si déjà assigné
            $exists = TrackingFormAssignment::where('form_id', $trackingForm->id)
                ->where('student_id', $studentId)
                ->exists();

            if ($exists) {
                $alreadyAssignedCount++;

                continue;
            }

            TrackingFormAssignment::create([
                'form_id' => $trackingForm->id,
                'student_id' => $studentId,
            ]);

            Notification::create([
                'user_id' => $studentId,
                'type' => 'tracking',
                'category' => 'tracking_form_assigned',
                'title' => 'Nouveau formulaire de suivi',
                'message' => "Un formulaire de suivi vous a été envoyé : \"{$trackingForm->title}\". Veuillez le compléter dès que possible.",
                'action_url' => '/student/tracking',
            ]);

            $assignedCount++;
        }

        return response()->json([
            'message' => "Formulaire envoyé à {$assignedCount} élève(s).",
            'assigned_count' => $assignedCount,
            'already_assigned_count' => $alreadyAssignedCount,
        ]);
    }

    /**
     * Liste les élèves assignés à un formulaire avec leur statut
     */
    public function assignments(TrackingForm $trackingForm): JsonResponse
    {
        $assignments = TrackingFormAssignment::with([
            'student.studentProfile',
            'responses.question',
        ])
            ->where('form_id', $trackingForm->id)
            ->orderBy('completed_at', 'desc')
            ->orderBy('sent_at', 'desc')
            ->get();

        return response()->json([
            'assignments' => $assignments,
        ]);
    }

    /**
     * Voir les réponses d'un élève pour un formulaire
     */
    public function studentResponses(TrackingForm $trackingForm, User $student): JsonResponse
    {
        $assignment = TrackingFormAssignment::with(['responses.question'])
            ->where('form_id', $trackingForm->id)
            ->where('student_id', $student->id)
            ->firstOrFail();

        $trackingForm->load('questions');

        return response()->json([
            'form' => $trackingForm,
            'assignment' => $assignment,
        ]);
    }

    /**
     * Récupérer les élèves disponibles pour l'assignation
     * (filtrés par classe ou tous)
     */
    public function availableStudents(Request $request): JsonResponse
    {
        $query = User::where('role', 'student')
            ->with('studentProfile');

        // Filtre par classe
        if ($request->has('class_id')) {
            $class = ClassModel::findOrFail($request->class_id);
            $studentIds = $class->students->pluck('id');
            $query->whereIn('id', $studentIds);
        }

        // Recherche
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $students = $query->orderBy('last_name')->get();

        return response()->json([
            'students' => $students,
        ]);
    }
}
