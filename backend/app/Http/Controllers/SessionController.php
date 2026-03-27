<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\SessionRequest;
use App\Models\ClassModel;
use App\Models\Session;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SessionController extends Controller
{
    /**
     * Display a listing of sessions.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            $query = Session::with(['class.program', 'teacher']);

            // Filter based on user role
            if ($user->role === 'student') {
                // Students see only sessions of classes they're enrolled in
                $query->whereHas('class.enrollments', function ($q) use ($user): void {
                    $q->where('student_id', $user->id)
                        ->where('status', 'active');
                });
            } elseif ($user->role === 'teacher') {
                // Teachers see only their own sessions
                $query->where('teacher_id', $user->id);
            }
            // Admins see all sessions (no filter)

            $perPage = $request->input('per_page', 15);
            $sessions = $query->distinct()->orderBy('scheduled_at', 'desc')->paginate($perPage);

            return response()->json([
                'sessions' => $sessions,
            ], 200);

        } catch (\Exception $e) {
            Log::error('Sessions index error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la récupération des sessions.',
            ], 500);
        }
    }

    /**
     * Store a newly created session.
     * Protected - Teacher/Admin only
     */
    public function store(SessionRequest $request): JsonResponse
    {
        try {
            // Verify teacher ownership if not admin
            if ($request->user()->role === 'teacher' && $request->teacher_id !== $request->user()->id) {
                return response()->json([
                    'message' => 'Vous ne pouvez créer des sessions que pour vous-même.',
                ], 403);
            }

            // Vérifier que le professeur a accès à cette classe
            $class = ClassModel::with('program')->findOrFail($request->class_id);
            if ($request->user()->role === 'teacher' && $class->program->created_by !== $request->user()->id) {
                return response()->json([
                    'message' => 'Vous ne pouvez pas créer de sessions pour cette classe.',
                ], 403);
            }

            $session = Session::create([
                ...$request->validated(),
                'status' => $request->status ?? 'scheduled',
            ]);

            $session->load(['class.program', 'teacher']);

            return response()->json([
                'message' => 'Session créée avec succès.',
                'session' => $session,
            ], 201);

        } catch (\Exception $e) {
            Log::error('Session store error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la création de la session.',
            ], 500);
        }
    }

    /**
     * Display the specified session.
     */
    public function show(Request $request, Session $session): JsonResponse
    {
        try {
            $user = $request->user();

            // Authorization check
            if ($user->role === 'student') {
                // Check if student is enrolled in the class
                $enrolled = $session->class->enrollments()
                    ->where('student_id', $user->id)
                    ->where('status', 'active')
                    ->exists();

                if (! $enrolled) {
                    return response()->json([
                        'message' => 'Vous n\'êtes pas inscrit à cette classe.',
                    ], 403);
                }
            } elseif ($user->role === 'teacher' && $session->teacher_id !== $user->id) {
                return response()->json([
                    'message' => 'Vous n\'êtes pas autorisé à voir cette session.',
                ], 403);
            }

            $session->load(['class.program', 'teacher', 'attendances.student']);

            return response()->json([
                'session' => $session,
            ], 200);

        } catch (\Exception $e) {
            Log::error('Session show error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la récupération de la session.',
            ], 500);
        }
    }

    /**
     * Update the specified session.
     * Protected - Session teacher/Admin only
     */
    public function update(SessionRequest $request, Session $session): JsonResponse
    {
        try {
            // Verify authorization
            if ($request->user()->role !== 'admin' && $session->teacher_id !== $request->user()->id) {
                return response()->json([
                    'message' => 'Vous n\'êtes pas autorisé à modifier cette session.',
                ], 403);
            }

            // Teachers cannot assign sessions to other teachers
            if ($request->user()->role === 'teacher' && $request->has('teacher_id') && $request->teacher_id !== $request->user()->id) {
                return response()->json([
                    'message' => 'Vous ne pouvez pas assigner cette session à un autre professeur.',
                ], 403);
            }

            // Vérifier que le professeur a accès à cette classe (si changement de class_id)
            if ($request->has('class_id') && $request->class_id !== $session->class_id) {
                $class = ClassModel::with('program')->findOrFail($request->class_id);
                if ($request->user()->role === 'teacher' && $class->program->created_by !== $request->user()->id) {
                    return response()->json([
                        'message' => 'Vous ne pouvez pas assigner cette session à cette classe.',
                    ], 403);
                }
            }

            $data = $request->validated();

            // Si on ajoute un replay pour la première fois, on enregistre la date
            if (isset($data['replay_url']) && $data['replay_url'] && ! $session->replay_url) {
                $data['replay_added_at'] = now();
            }

            // Si on supprime le replay (url vide), on réinitialise les champs
            if (array_key_exists('replay_url', $data) && empty($data['replay_url'])) {
                $data['replay_url'] = null;
                $data['replay_validity_days'] = null;
                $data['replay_added_at'] = null;
            }

            $session->update($data);
            $session->load(['class.program', 'teacher']);

            return response()->json([
                'message' => 'Session mise à jour avec succès.',
                'session' => $session,
            ], 200);

        } catch (\Exception $e) {
            Log::error('Session update error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la mise à jour de la session.',
            ], 500);
        }
    }

    /**
     * Remove the specified session.
     * Protected - Session teacher/Admin only
     */
    public function destroy(Request $request, Session $session): JsonResponse
    {
        try {
            // Verify authorization
            if ($request->user()->role !== 'admin' && $session->teacher_id !== $request->user()->id) {
                return response()->json([
                    'message' => 'Vous n\'êtes pas autorisé à supprimer cette session.',
                ], 403);
            }

            $session->delete();

            return response()->json([
                'message' => 'Session supprimée avec succès.',
            ], 200);

        } catch (\Exception $e) {
            Log::error('Session destroy error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la suppression de la session.',
            ], 500);
        }
    }
}
