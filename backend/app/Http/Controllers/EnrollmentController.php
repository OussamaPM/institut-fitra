<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\EnrollmentRequest;
use App\Http\Requests\EnrollmentUpdateRequest;
use App\Mail\EnrollmentConfirmationMail;
use App\Models\ClassModel;
use App\Models\Enrollment;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class EnrollmentController extends Controller
{
    /**
     * Get student's enrollments.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $enrollments = Enrollment::where('student_id', $request->user()->id)
                ->with(['class.program.teacher.teacherProfile'])
                ->latest()
                ->get();

            return response()->json([
                'enrollments' => $enrollments,
            ], 200);

        } catch (\Exception $e) {
            Log::error('Enrollments index error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la récupération des inscriptions.',
            ], 500);
        }
    }

    /**
     * Get all enrollments (Admin only).
     */
    public function adminIndex(Request $request): JsonResponse
    {
        try {
            $query = Enrollment::with([
                'student.studentProfile',
                'class.program.teacher.teacherProfile',
            ]);

            // Filtrage optionnel par statut
            if ($request->has('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            // Filtrage optionnel par classe
            if ($request->has('class_id') && $request->class_id) {
                $query->where('class_id', $request->class_id);
            }

            // Filtrage optionnel par programme
            if ($request->has('program_id') && $request->program_id) {
                $query->whereHas('class', function ($q) use ($request) {
                    $q->where('program_id', $request->program_id);
                });
            }

            // Recherche par nom ou email
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->whereHas('student', function ($q) use ($search) {
                    $q->where('email', 'like', "%{$search}%")
                        ->orWhere('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%");
                });
            }

            $enrollments = $query->latest()->get();

            return response()->json([
                'enrollments' => $enrollments,
            ], 200);

        } catch (\Exception $e) {
            Log::error('Admin enrollments index error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la récupération des inscriptions.',
            ], 500);
        }
    }

    /**
     * Get a single enrollment (Admin only).
     */
    public function show(Enrollment $enrollment): JsonResponse
    {
        try {
            $enrollment->load([
                'student.studentProfile',
                'class.program.teacher.teacherProfile',
            ]);

            return response()->json([
                'enrollment' => $enrollment,
            ], 200);

        } catch (\Exception $e) {
            Log::error('Enrollment show error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la récupération de l\'inscription.',
            ], 500);
        }
    }

    /**
     * Enroll a student to a class (Admin only).
     */
    public function store(EnrollmentRequest $request): JsonResponse
    {
        try {
            $validated = $request->validated();

            // Check if already enrolled
            $existing = Enrollment::where('student_id', $validated['student_id'])
                ->where('class_id', $validated['class_id'])
                ->first();

            if ($existing) {
                return response()->json([
                    'message' => 'L\'élève est déjà inscrit à cette classe.',
                ], 422);
            }

            // Vérifier la capacité de la classe
            $class = ClassModel::findOrFail($validated['class_id']);
            if ($class->max_students && $class->enrolled_students_count >= $class->max_students) {
                return response()->json([
                    'message' => 'Cette classe a atteint sa capacité maximale d\'élèves.',
                ], 422);
            }

            $enrollment = Enrollment::create([
                'student_id' => $validated['student_id'],
                'class_id' => $validated['class_id'],
                'status' => 'active',
                'enrolled_at' => now(),
                'expires_at' => $validated['expires_at'] ?? null,
            ]);

            $enrollment->load(['student.studentProfile', 'class.program.teacher.teacherProfile']);

            // Envoyer l'email de confirmation
            try {
                $student = User::find($validated['student_id']);
                if ($student) {
                    Mail::to($student->email)->send(new EnrollmentConfirmationMail($student, $enrollment));
                }
            } catch (\Exception $e) {
                Log::error('Enrollment confirmation email error: '.$e->getMessage());
            }

            return response()->json([
                'message' => 'Inscription créée avec succès.',
                'enrollment' => $enrollment,
            ], 201);

        } catch (\Exception $e) {
            Log::error('Enrollment store error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la création de l\'inscription.',
            ], 500);
        }
    }

    /**
     * Update enrollment status (Admin only).
     */
    public function update(EnrollmentUpdateRequest $request, Enrollment $enrollment): JsonResponse
    {
        try {
            $validated = $request->validated();

            $wasActive = $enrollment->status === 'active';
            $enrollment->update($validated);
            $enrollment->load(['student.studentProfile', 'class.program.teacher.teacherProfile']);

            // Envoyer l'email de confirmation si le statut vient de passer à active
            if (! $wasActive && $enrollment->status === 'active') {
                try {
                    Mail::to($enrollment->student->email)->send(
                        new EnrollmentConfirmationMail($enrollment->student, $enrollment)
                    );
                } catch (\Exception $e) {
                    Log::error('Enrollment confirmation email error: '.$e->getMessage());
                }
            }

            return response()->json([
                'message' => 'Inscription mise à jour avec succès.',
                'enrollment' => $enrollment,
            ], 200);

        } catch (\Exception $e) {
            Log::error('Enrollment update error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la mise à jour de l\'inscription.',
            ], 500);
        }
    }

    /**
     * Delete an enrollment (Admin only).
     */
    public function destroy(Enrollment $enrollment): JsonResponse
    {
        try {
            $enrollment->delete();

            return response()->json([
                'message' => 'Inscription supprimée avec succès.',
            ], 200);

        } catch (\Exception $e) {
            Log::error('Enrollment destroy error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la suppression de l\'inscription.',
            ], 500);
        }
    }
}
