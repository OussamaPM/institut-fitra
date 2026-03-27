<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Session;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AttendanceTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test that teacher can view attendance list of their session.
     */
    public function test_teacher_can_view_attendance_list_of_their_session(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $session = Session::factory()->create(['teacher_id' => $teacher->id]);

        $student1 = User::factory()->create(['role' => 'student']);
        $student2 = User::factory()->create(['role' => 'student']);

        Attendance::factory()->create([
            'session_id' => $session->id,
            'student_id' => $student1->id,
            'attended' => true,
        ]);

        Attendance::factory()->create([
            'session_id' => $session->id,
            'student_id' => $student2->id,
            'attended' => false,
        ]);

        $response = $this->actingAs($teacher)
            ->getJson("/api/sessions/{$session->id}/attendance");

        $response->assertStatus(200)
            ->assertJsonCount(2, 'attendances');
    }

    /**
     * Test that teacher cannot view attendance of another teacher's session.
     */
    public function test_teacher_cannot_view_attendance_of_another_teachers_session(): void
    {
        $teacher1 = User::factory()->create(['role' => 'teacher']);
        $teacher2 = User::factory()->create(['role' => 'teacher']);
        $session = Session::factory()->create(['teacher_id' => $teacher1->id]);

        $response = $this->actingAs($teacher2)
            ->getJson("/api/sessions/{$session->id}/attendance");

        $response->assertStatus(403);
    }

    /**
     * Test that admin can view any session's attendance.
     */
    public function test_admin_can_view_any_session_attendance(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $session = Session::factory()->create(['teacher_id' => $teacher->id]);

        Attendance::factory()->count(3)->create(['session_id' => $session->id]);

        $response = $this->actingAs($admin)
            ->getJson("/api/sessions/{$session->id}/attendance");

        $response->assertStatus(200)
            ->assertJsonCount(3, 'attendances');
    }

    /**
     * Test that teacher can mark student attendance.
     */
    public function test_teacher_can_mark_student_attendance(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $student = User::factory()->create(['role' => 'student']);
        $session = Session::factory()->create(['teacher_id' => $teacher->id]);

        $attendanceData = [
            'student_id' => $student->id,
            'attended' => true,
            'duration_minutes' => 120,
            'joined_at' => now()->toDateTimeString(),
        ];

        $response = $this->actingAs($teacher)
            ->postJson("/api/sessions/{$session->id}/attendance", $attendanceData);

        $response->assertStatus(200)
            ->assertJsonPath('attendance.student_id', $student->id)
            ->assertJsonPath('attendance.attended', true);

        $this->assertDatabaseHas('attendances', [
            'session_id' => $session->id,
            'student_id' => $student->id,
            'attended' => true,
        ]);
    }

    /**
     * Test that teacher cannot mark attendance for another teacher's session.
     */
    public function test_teacher_cannot_mark_attendance_for_another_teachers_session(): void
    {
        $teacher1 = User::factory()->create(['role' => 'teacher']);
        $teacher2 = User::factory()->create(['role' => 'teacher']);
        $student = User::factory()->create(['role' => 'student']);
        $session = Session::factory()->create(['teacher_id' => $teacher1->id]);

        $attendanceData = [
            'student_id' => $student->id,
            'attended' => true,
        ];

        $response = $this->actingAs($teacher2)
            ->postJson("/api/sessions/{$session->id}/attendance", $attendanceData);

        $response->assertStatus(403);
    }

    /**
     * Test that admin can mark attendance for any session.
     */
    public function test_admin_can_mark_attendance_for_any_session(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $student = User::factory()->create(['role' => 'student']);
        $session = Session::factory()->create(['teacher_id' => $teacher->id]);

        $attendanceData = [
            'student_id' => $student->id,
            'attended' => true,
            'duration_minutes' => 90,
        ];

        $response = $this->actingAs($admin)
            ->postJson("/api/sessions/{$session->id}/attendance", $attendanceData);

        $response->assertStatus(200)
            ->assertJsonPath('attendance.attended', true);
    }

    /**
     * Test attendance marking validation.
     */
    public function test_attendance_marking_requires_valid_data(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $session = Session::factory()->create(['teacher_id' => $teacher->id]);

        $response = $this->actingAs($teacher)
            ->postJson("/api/sessions/{$session->id}/attendance", []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['student_id', 'attended']);
    }

    /**
     * Test that marking attendance updates existing record.
     */
    public function test_marking_attendance_updates_existing_record(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $student = User::factory()->create(['role' => 'student']);
        $session = Session::factory()->create(['teacher_id' => $teacher->id]);

        // Create initial attendance
        Attendance::factory()->create([
            'session_id' => $session->id,
            'student_id' => $student->id,
            'attended' => false,
        ]);

        // Update attendance
        $attendanceData = [
            'student_id' => $student->id,
            'attended' => true,
            'duration_minutes' => 120,
        ];

        $response = $this->actingAs($teacher)
            ->postJson("/api/sessions/{$session->id}/attendance", $attendanceData);

        $response->assertStatus(200)
            ->assertJsonPath('attendance.attended', true);

        // Should still have only one attendance record
        $this->assertCount(1, Attendance::where('session_id', $session->id)
            ->where('student_id', $student->id)
            ->get());
    }

    /**
     * Test that student can view their attendance history.
     */
    public function test_student_can_view_their_attendance_history(): void
    {
        $student = User::factory()->create(['role' => 'student']);

        $session1 = Session::factory()->create();
        $session2 = Session::factory()->create();

        Attendance::factory()->create([
            'student_id' => $student->id,
            'session_id' => $session1->id,
            'attended' => true,
        ]);

        Attendance::factory()->create([
            'student_id' => $student->id,
            'session_id' => $session2->id,
            'attended' => false,
        ]);

        // Create attendance for another student (should not be visible)
        $otherStudent = User::factory()->create(['role' => 'student']);
        Attendance::factory()->create([
            'student_id' => $otherStudent->id,
            'session_id' => $session1->id,
        ]);

        $response = $this->actingAs($student)
            ->getJson('/api/attendance/history');

        $response->assertStatus(200)
            ->assertJsonCount(2, 'attendances.data')
            ->assertJsonPath('statistics.total_sessions', 2)
            ->assertJsonPath('statistics.attended_sessions', 1);

        $this->assertEquals(50.0, $response->json('statistics.attendance_rate'));
    }

    /**
     * Test that student cannot mark attendance.
     */
    public function test_student_cannot_mark_attendance(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        $session = Session::factory()->create();

        $attendanceData = [
            'student_id' => $student->id,
            'attended' => true,
        ];

        $response = $this->actingAs($student)
            ->postJson("/api/sessions/{$session->id}/attendance", $attendanceData);

        $response->assertStatus(403);
    }

    /**
     * Test that student cannot view other students' attendance.
     */
    public function test_student_cannot_view_other_students_attendance(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $session = Session::factory()->create(['teacher_id' => $teacher->id]);

        $response = $this->actingAs($student)
            ->getJson("/api/sessions/{$session->id}/attendance");

        $response->assertStatus(403);
    }

    /**
     * Test attendance statistics calculation.
     */
    public function test_attendance_statistics_calculation(): void
    {
        $student = User::factory()->create(['role' => 'student']);

        // Create 5 sessions, student attended 4
        for ($i = 0; $i < 5; $i++) {
            $session = Session::factory()->create();
            Attendance::factory()->create([
                'student_id' => $student->id,
                'session_id' => $session->id,
                'attended' => $i < 4,
            ]);
        }

        $response = $this->actingAs($student)
            ->getJson('/api/attendance/history');

        $response->assertStatus(200)
            ->assertJsonPath('statistics.total_sessions', 5)
            ->assertJsonPath('statistics.attended_sessions', 4);

        $this->assertEquals(80.0, $response->json('statistics.attendance_rate'));
    }
}
