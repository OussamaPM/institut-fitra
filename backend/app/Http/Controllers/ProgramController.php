<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\ProgramRequest;
use App\Models\Program;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ProgramController extends Controller
{
    /**
     * Get list of available teachers (teachers + admins).
     * Protected - Admin only
     */
    public function getTeachers(): JsonResponse
    {
        try {
            $teachers = User::whereIn('role', ['teacher', 'admin'])
                ->with('teacherProfile')
                ->orderBy('role', 'desc') // admins first
                ->orderBy('email')
                ->get();

            return response()->json(['teachers' => $teachers], 200);

        } catch (\Exception $e) {
            Log::error('Get teachers error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la récupération des enseignants.',
            ], 500);
        }
    }

    /**
     * Display a listing of programs.
     * Public route - accessible to all
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Program::with(['creator', 'teacher.teacherProfile', 'classes', 'defaultClass'])
                ->withCount('levels');

            // Filter by active status for public view
            if (! $request->user() || $request->user()->role === 'student') {
                $query->where('active', true);
            }

            $programs = $query->latest()->paginate(15);

            return response()->json(['programs' => $programs], 200);

        } catch (\Exception $e) {
            Log::error('Programs index error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la récupération des programmes.',
            ], 500);
        }
    }

    /**
     * Store a newly created program.
     * Protected - Teacher/Admin only
     */
    public function store(ProgramRequest $request): JsonResponse
    {
        try {
            $program = Program::create([
                ...$request->validated(),
                'created_by' => $request->user()->id,
            ]);

            $program->load(['creator', 'teacher.teacherProfile', 'classes', 'defaultClass']);

            return response()->json([
                'message' => 'Programme créé avec succès.',
                'program' => $program,
            ], 201);

        } catch (\Exception $e) {
            Log::error('Program store error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la création du programme.',
            ], 500);
        }
    }

    /**
     * Display the specified program.
     * Public route
     */
    public function show(Program $program): JsonResponse
    {
        try {
            $program->load(['creator', 'teacher.teacherProfile', 'classes', 'defaultClass', 'levels.teacher.teacherProfile', 'levels.activations.class']);
            $program->loadCount('levels');

            return response()->json(['program' => $program], 200);

        } catch (\Exception $e) {
            Log::error('Program show error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la récupération du programme.',
            ], 500);
        }
    }

    /**
     * Update the specified program.
     * Protected - Creator/Admin only
     */
    public function update(ProgramRequest $request, Program $program): JsonResponse
    {
        try {
            // Check authorization: only creator or admin can update
            if ($request->user()->role !== 'admin' && $program->created_by !== $request->user()->id) {
                return response()->json([
                    'message' => 'Vous n\'êtes pas autorisé à modifier ce programme.',
                ], 403);
            }

            $program->update($request->validated());
            $program->load(['creator', 'teacher.teacherProfile', 'classes', 'defaultClass', 'levels.teacher.teacherProfile', 'levels.activations.class']);
            $program->loadCount('levels');

            return response()->json([
                'message' => 'Programme mis à jour avec succès.',
                'program' => $program,
            ], 200);

        } catch (\Exception $e) {
            Log::error('Program update error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la mise à jour du programme.',
            ], 500);
        }
    }

    /**
     * Remove the specified program.
     * Protected - Creator/Admin only
     */
    public function destroy(Request $request, Program $program): JsonResponse
    {
        try {
            // Check authorization: only creator or admin can delete
            if ($request->user()->role !== 'admin' && $program->created_by !== $request->user()->id) {
                return response()->json([
                    'message' => 'Vous n\'êtes pas autorisé à supprimer ce programme.',
                ], 403);
            }

            $program->delete();

            return response()->json([
                'message' => 'Programme supprimé avec succès.',
            ], 200);

        } catch (\Exception $e) {
            Log::error('Program destroy error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la suppression du programme.',
            ], 500);
        }
    }
}
