<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Session;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AttendanceController extends Controller
{
    /**
     * Get attendance list for a specific session.
     * Protected - Teacher/Admin only
     */
    public function index(Request $request, Session $session): JsonResponse
    {
        try {
            // Verify authorization
            if ($request->user()->role === 'teacher' && $session->teacher_id !== $request->user()->id) {
                return response()->json([
                    'message' => 'Vous n\'êtes pas autorisé à voir les présences de cette session.',
                ], 403);
            }

            $attendances = $session->attendances()
                ->with('student.studentProfile')
                ->get();

            return response()->json([
                'attendances' => $attendances,
            ], 200);

        } catch (\Exception $e) {
            Log::error('Attendances index error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la récupération des présences.',
            ], 500);
        }
    }

    /**
     * Mark student attendance for a session.
     * Protected - Teacher/Admin only
     */
    public function markAttendance(Request $request, Session $session): JsonResponse
    {
        $validated = $request->validate([
            'student_id' => ['required', 'exists:users,id'],
            'attended' => ['required', 'boolean'],
            'duration_minutes' => ['nullable', 'integer', 'min:0'],
            'joined_at' => ['nullable', 'date'],
        ]);

        try {
            // Verify authorization
            if ($request->user()->role === 'teacher' && $session->teacher_id !== $request->user()->id) {
                return response()->json([
                    'message' => 'Vous n\'êtes pas autorisé à marquer les présences pour cette session.',
                ], 403);
            }

            $attendance = Attendance::updateOrCreate(
                [
                    'session_id' => $session->id,
                    'student_id' => $validated['student_id'],
                ],
                [
                    'attended' => $validated['attended'],
                    'duration_minutes' => $validated['duration_minutes'] ?? null,
                    'joined_at' => $validated['joined_at'] ?? ($validated['attended'] ? now() : null),
                ]
            );

            $attendance->load('student.studentProfile');

            return response()->json([
                'message' => 'Présence enregistrée avec succès.',
                'attendance' => $attendance,
            ], 200);

        } catch (\Exception $e) {
            Log::error('Attendance mark error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de l\'enregistrement de la présence.',
            ], 500);
        }
    }

    /**
     * Get student's attendance history.
     * Protected - Student/Teacher/Admin
     */
    public function studentHistory(Request $request): JsonResponse
    {
        try {
            $studentId = $request->user()->role === 'student'
                ? $request->user()->id
                : $request->input('student_id');

            if (! $studentId) {
                return response()->json([
                    'message' => 'L\'identifiant de l\'élève est requis.',
                ], 422);
            }

            $attendances = Attendance::where('student_id', $studentId)
                ->with(['session.class.program'])
                ->latest()
                ->paginate(20);

            // Calculate statistics
            $totalSessions = $attendances->total();
            $attendedSessions = Attendance::where('student_id', $studentId)
                ->where('attended', true)
                ->count();
            $attendanceRate = $totalSessions > 0 ? (float) round(($attendedSessions / $totalSessions) * 100, 2) : 0.0;

            return response()->json([
                'attendances' => $attendances,
                'statistics' => [
                    'total_sessions' => $totalSessions,
                    'attended_sessions' => $attendedSessions,
                    'attendance_rate' => $attendanceRate,
                ],
            ], 200);

        } catch (\Exception $e) {
            Log::error('Student attendance history error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la récupération de l\'historique des présences.',
            ], 500);
        }
    }
}
