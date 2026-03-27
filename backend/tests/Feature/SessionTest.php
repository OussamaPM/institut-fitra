<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\ClassModel;
use App\Models\Enrollment;
use App\Models\Program;
use App\Models\Session;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SessionTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test that student can view sessions of their enrolled programs.
     */
    public function test_student_can_view_their_sessions(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        $teacher = User::factory()->create(['role' => 'teacher']);

        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);

        // Enroll student
        Enrollment::factory()->create([
            'student_id' => $student->id,
            'class_id' => $class->id,
            'status' => 'active',
        ]);

        // Create session for this course
        Session::factory()->create([
            'class_id' => $class->id,
            'teacher_id' => $teacher->id,
        ]);

        // Create session for another program (should not be visible)
        $otherCourse = ClassModel::factory()->create();
        Session::factory()->create(['class_id' => $otherCourse->id]);

        $response = $this->actingAs($student)
            ->getJson('/api/sessions');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'sessions.data');
    }

    /**
     * Test that teacher can view only their sessions.
     */
    public function test_teacher_can_view_only_their_sessions(): void
    {
        $teacher1 = User::factory()->create(['role' => 'teacher']);
        $teacher2 = User::factory()->create(['role' => 'teacher']);

        $class = ClassModel::factory()->create();

        Session::factory()->count(2)->create(['teacher_id' => $teacher1->id, 'class_id' => $class->id]);
        Session::factory()->count(3)->create(['teacher_id' => $teacher2->id, 'class_id' => $class->id]);

        $response = $this->actingAs($teacher1)
            ->getJson('/api/sessions');

        $response->assertStatus(200)
            ->assertJsonCount(2, 'sessions.data');
    }

    /**
     * Test that admin can view all sessions.
     */
    public function test_admin_can_view_all_sessions(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $teacher1 = User::factory()->create(['role' => 'teacher']);
        $teacher2 = User::factory()->create(['role' => 'teacher']);

        $class = ClassModel::factory()->create();

        Session::factory()->count(2)->create(['teacher_id' => $teacher1->id, 'class_id' => $class->id]);
        Session::factory()->count(3)->create(['teacher_id' => $teacher2->id, 'class_id' => $class->id]);

        $response = $this->actingAs($admin)
            ->getJson('/api/sessions');

        $response->assertStatus(200)
            ->assertJsonCount(5, 'sessions.data');
    }

    /**
     * Test that teacher can create session for their program.
     */
    public function test_teacher_can_create_session(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);

        $sessionData = [
            'class_id' => $class->id,
            'teacher_id' => $teacher->id,
            'title' => 'Introduction à Laravel',
            'description' => 'Première session du cours',
            'scheduled_at' => now()->addDays(7)->toIso8601String(),
            'duration_minutes' => 120,
            'status' => 'scheduled',
        ];

        $response = $this->actingAs($teacher)
            ->postJson('/api/sessions', $sessionData);

        $response->assertStatus(201)
            ->assertJsonPath('session.title', 'Introduction à Laravel')
            ->assertJsonPath('session.teacher_id', $teacher->id);

        $this->assertDatabaseHas('class_sessions', [
            'title' => 'Introduction à Laravel',
            'teacher_id' => $teacher->id,
        ]);
    }

    /**
     * Test that teacher cannot create session for another teacher.
     */
    public function test_teacher_cannot_create_session_for_another_teacher(): void
    {
        $teacher1 = User::factory()->create(['role' => 'teacher']);
        $teacher2 = User::factory()->create(['role' => 'teacher']);
        $class = ClassModel::factory()->create();

        $sessionData = [
            'class_id' => $class->id,
            'teacher_id' => $teacher2->id,
            'title' => 'Session Test',
            'description' => 'Description',
            'scheduled_at' => now()->addDays(7)->toIso8601String(),
            'duration_minutes' => 60,
        ];

        $response = $this->actingAs($teacher1)
            ->postJson('/api/sessions', $sessionData);

        $response->assertStatus(403);
    }

    /**
     * Test that admin can create session for any teacher.
     */
    public function test_admin_can_create_session_for_any_teacher(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $class = ClassModel::factory()->create();

        $sessionData = [
            'class_id' => $class->id,
            'teacher_id' => $teacher->id,
            'title' => 'Session créée par admin',
            'description' => 'Description',
            'scheduled_at' => now()->addDays(7)->toIso8601String(),
            'duration_minutes' => 90,
        ];

        $response = $this->actingAs($admin)
            ->postJson('/api/sessions', $sessionData);

        $response->assertStatus(201)
            ->assertJsonPath('session.title', 'Session créée par admin');
    }

    /**
     * Test session creation validation.
     */
    public function test_session_creation_requires_valid_data(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);

        $response = $this->actingAs($teacher)
            ->postJson('/api/sessions', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['class_id', 'title', 'scheduled_at', 'duration_minutes']);
    }

    /**
     * Test that enrolled student can view session details.
     */
    public function test_enrolled_student_can_view_session_details(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        $teacher = User::factory()->create(['role' => 'teacher']);

        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);

        Enrollment::factory()->create([
            'student_id' => $student->id,
            'class_id' => $class->id,
            'status' => 'active',
        ]);

        $session = Session::factory()->create([
            'class_id' => $class->id,
            'teacher_id' => $teacher->id,
        ]);

        $response = $this->actingAs($student)
            ->getJson("/api/sessions/{$session->id}");

        $response->assertStatus(200)
            ->assertJsonPath('session.id', $session->id);
    }

    /**
     * Test that non-enrolled student cannot view session details.
     */
    public function test_non_enrolled_student_cannot_view_session_details(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        $session = Session::factory()->create();

        $response = $this->actingAs($student)
            ->getJson("/api/sessions/{$session->id}");

        $response->assertStatus(403);
    }

    /**
     * Test that teacher can update their session.
     */
    public function test_teacher_can_update_their_session(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $class = ClassModel::factory()->create();
        $session = Session::factory()->create([
            'teacher_id' => $teacher->id,
            'class_id' => $class->id,
        ]);

        $updatedData = [
            'class_id' => $class->id,
            'teacher_id' => $teacher->id,
            'title' => 'Titre Mis à Jour',
            'description' => $session->description,
            'scheduled_at' => now()->addDays(10)->toIso8601String(),
            'duration_minutes' => $session->duration_minutes,
            'status' => $session->status,
        ];

        $response = $this->actingAs($teacher)
            ->putJson("/api/sessions/{$session->id}", $updatedData);

        $response->assertStatus(200)
            ->assertJsonPath('session.title', 'Titre Mis à Jour');

        $this->assertDatabaseHas('class_sessions', [
            'id' => $session->id,
            'title' => 'Titre Mis à Jour',
        ]);
    }

    /**
     * Test that teacher cannot update another teacher's session.
     */
    public function test_teacher_cannot_update_another_teachers_session(): void
    {
        $teacher1 = User::factory()->create(['role' => 'teacher']);
        $teacher2 = User::factory()->create(['role' => 'teacher']);
        $class = ClassModel::factory()->create();
        $session = Session::factory()->create([
            'teacher_id' => $teacher1->id,
            'class_id' => $class->id,
        ]);

        $updatedData = [
            'class_id' => $class->id,
            'teacher_id' => $teacher1->id,
            'title' => 'Tentative de modification',
            'description' => $session->description,
            'scheduled_at' => now()->addDays(5)->toIso8601String(),
            'duration_minutes' => $session->duration_minutes,
            'status' => $session->status,
        ];

        $response = $this->actingAs($teacher2)
            ->putJson("/api/sessions/{$session->id}", $updatedData);

        $response->assertStatus(403);
    }

    /**
     * Test that teacher can delete their session.
     */
    public function test_teacher_can_delete_their_session(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $session = Session::factory()->create(['teacher_id' => $teacher->id]);

        $response = $this->actingAs($teacher)
            ->deleteJson("/api/sessions/{$session->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('class_sessions', ['id' => $session->id]);
    }

    /**
     * Test that teacher cannot delete another teacher's session.
     */
    public function test_teacher_cannot_delete_another_teachers_session(): void
    {
        $teacher1 = User::factory()->create(['role' => 'teacher']);
        $teacher2 = User::factory()->create(['role' => 'teacher']);
        $session = Session::factory()->create(['teacher_id' => $teacher1->id]);

        $response = $this->actingAs($teacher2)
            ->deleteJson("/api/sessions/{$session->id}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('class_sessions', ['id' => $session->id]);
    }

    /**
     * Test that student cannot create sessions.
     */
    public function test_student_cannot_create_session(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        $class = ClassModel::factory()->create();

        $sessionData = [
            'class_id' => $class->id,
            'teacher_id' => $student->id,
            'title' => 'Session Test',
            'description' => 'Description',
            'scheduled_at' => now()->addDays(7)->toIso8601String(),
            'duration_minutes' => 60,
        ];

        $response = $this->actingAs($student)
            ->postJson('/api/sessions', $sessionData);

        $response->assertStatus(403);
    }
}
