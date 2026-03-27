<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\ClassModel;
use App\Models\Enrollment;
use App\Models\Program;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EnrollmentTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test that student can view their enrollments.
     */
    public function test_student_can_view_their_enrollments(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        $program1 = Program::factory()->create();
        $program2 = Program::factory()->create();

        $class1 = ClassModel::factory()->create(['program_id' => $program1->id]);
        $class2 = ClassModel::factory()->create(['program_id' => $program2->id]);

        Enrollment::factory()->create([
            'student_id' => $student->id,
            'class_id' => $class1->id,
            'status' => 'active',
        ]);

        Enrollment::factory()->create([
            'student_id' => $student->id,
            'class_id' => $class2->id,
            'status' => 'active',
        ]);

        // Create enrollment for another student
        $otherStudent = User::factory()->create(['role' => 'student']);
        Enrollment::factory()->create([
            'student_id' => $otherStudent->id,
            'class_id' => $class1->id,
        ]);

        $response = $this->actingAs($student)
            ->getJson('/api/enrollments');

        $response->assertStatus(200)
            ->assertJsonCount(2, 'enrollments');
    }

    /**
     * Test that admin can enroll student to program.
     */
    public function test_admin_can_enroll_student_to_program(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);
        $program = Program::factory()->create();
        $class = ClassModel::factory()->create(['program_id' => $program->id]);

        $enrollmentData = [
            'student_id' => $student->id,
            'class_id' => $class->id,
            'expires_at' => now()->addMonths(6)->toDateString(),
        ];

        $response = $this->actingAs($admin)
            ->postJson('/api/enrollments', $enrollmentData);

        $response->assertStatus(201)
            ->assertJsonPath('enrollment.student_id', $student->id)
            ->assertJsonPath('enrollment.class_id', $class->id)
            ->assertJsonPath('enrollment.status', 'active');

        $this->assertDatabaseHas('enrollments', [
            'student_id' => $student->id,
            'class_id' => $class->id,
            'status' => 'active',
        ]);
    }

    /**
     * Test that teacher cannot enroll students.
     */
    public function test_teacher_cannot_enroll_students(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $student = User::factory()->create(['role' => 'student']);
        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);

        $enrollmentData = [
            'student_id' => $student->id,
            'class_id' => $class->id,
        ];

        $response = $this->actingAs($teacher)
            ->postJson('/api/enrollments', $enrollmentData);

        $response->assertStatus(403);
    }

    /**
     * Test that student cannot enroll themselves.
     */
    public function test_student_cannot_enroll_themselves(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        $program = Program::factory()->create();
        $class = ClassModel::factory()->create(['program_id' => $program->id]);

        $enrollmentData = [
            'student_id' => $student->id,
            'class_id' => $class->id,
        ];

        $response = $this->actingAs($student)
            ->postJson('/api/enrollments', $enrollmentData);

        $response->assertStatus(403);
    }

    /**
     * Test that cannot enroll student twice to same program.
     */
    public function test_cannot_enroll_student_twice_to_same_class(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);
        $program = Program::factory()->create();
        $class = ClassModel::factory()->create(['program_id' => $program->id]);

        Enrollment::factory()->create([
            'student_id' => $student->id,
            'class_id' => $class->id,
        ]);

        $enrollmentData = [
            'student_id' => $student->id,
            'class_id' => $class->id,
        ];

        $response = $this->actingAs($admin)
            ->postJson('/api/enrollments', $enrollmentData);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'L\'élève est déjà inscrit à cette classe.');
    }

    /**
     * Test enrollment creation validation.
     */
    public function test_enrollment_creation_requires_valid_data(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)
            ->postJson('/api/enrollments', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['student_id', 'class_id']);
    }

    /**
     * Test that admin can update enrollment status.
     */
    public function test_admin_can_update_enrollment_status(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $enrollment = Enrollment::factory()->create(['status' => 'active']);

        $updatedData = [
            'status' => 'completed',
            'expires_at' => now()->addMonths(12)->toDateString(),
        ];

        $response = $this->actingAs($admin)
            ->putJson("/api/enrollments/{$enrollment->id}", $updatedData);

        $response->assertStatus(200)
            ->assertJsonPath('enrollment.status', 'completed');

        $this->assertDatabaseHas('enrollments', [
            'id' => $enrollment->id,
            'status' => 'completed',
        ]);
    }

    /**
     * Test that teacher cannot update enrollments.
     */
    public function test_teacher_cannot_update_enrollments(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $enrollment = Enrollment::factory()->create();

        $updatedData = [
            'status' => 'cancelled',
            'expires_at' => now()->toDateString(),
        ];

        $response = $this->actingAs($teacher)
            ->putJson("/api/enrollments/{$enrollment->id}", $updatedData);

        $response->assertStatus(403);
    }

    /**
     * Test enrollment status validation.
     */
    public function test_enrollment_status_must_be_valid(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $enrollment = Enrollment::factory()->create();

        $updatedData = [
            'status' => 'invalid_status',
            'expires_at' => now()->toDateString(),
        ];

        $response = $this->actingAs($admin)
            ->putJson("/api/enrollments/{$enrollment->id}", $updatedData);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['status']);
    }

    /**
     * Test that admin can delete enrollment.
     */
    public function test_admin_can_delete_enrollment(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $enrollment = Enrollment::factory()->create();

        $response = $this->actingAs($admin)
            ->deleteJson("/api/enrollments/{$enrollment->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('enrollments', ['id' => $enrollment->id]);
    }

    /**
     * Test that teacher cannot delete enrollments.
     */
    public function test_teacher_cannot_delete_enrollments(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $enrollment = Enrollment::factory()->create();

        $response = $this->actingAs($teacher)
            ->deleteJson("/api/enrollments/{$enrollment->id}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('enrollments', ['id' => $enrollment->id]);
    }

    /**
     * Test that student cannot delete their enrollment.
     */
    public function test_student_cannot_delete_their_enrollment(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        $enrollment = Enrollment::factory()->create(['student_id' => $student->id]);

        $response = $this->actingAs($student)
            ->deleteJson("/api/enrollments/{$enrollment->id}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('enrollments', ['id' => $enrollment->id]);
    }
}
