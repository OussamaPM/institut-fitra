<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\ClassModel;
use App\Models\Enrollment;
use App\Models\Program;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClassTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test: Admin can list all classes
     */
    public function test_admin_can_list_all_classes(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $admin->teacherProfile()->create([
            'first_name' => 'Admin',
            'last_name' => 'User',
            'phone' => '0123456789',
            'specialization' => 'Administration',
        ]);

        $program = Program::factory()->create(['created_by' => $admin->id]);
        ClassModel::factory()->count(3)->create(['program_id' => $program->id]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/classes');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                '*' => ['id', 'name', 'academic_year', 'start_date', 'end_date', 'status', 'program'],
            ],
        ]);
        $this->assertCount(3, $response->json('data'));
    }

    /**
     * Test: Teacher can only see their own classes
     */
    public function test_teacher_can_only_see_their_own_classes(): void
    {
        $teacher1 = User::factory()->create(['role' => 'teacher']);
        $teacher1->teacherProfile()->create([
            'first_name' => 'Teacher',
            'last_name' => 'One',
            'phone' => '0123456789',
            'specialization' => 'Math',
        ]);

        $teacher2 = User::factory()->create(['role' => 'teacher']);
        $teacher2->teacherProfile()->create([
            'first_name' => 'Teacher',
            'last_name' => 'Two',
            'phone' => '0987654321',
            'specialization' => 'Science',
        ]);

        $program1 = Program::factory()->create(['created_by' => $teacher1->id]);
        $program2 = Program::factory()->create(['created_by' => $teacher2->id]);

        ClassModel::factory()->count(2)->create(['program_id' => $program1->id]);
        ClassModel::factory()->count(3)->create(['program_id' => $program2->id]);

        $response = $this->actingAs($teacher1, 'sanctum')
            ->getJson('/api/classes');

        $response->assertStatus(200);
        $this->assertCount(2, $response->json('data'));
    }

    /**
     * Test: Can filter classes by academic year
     */
    public function test_can_filter_classes_by_academic_year(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $admin->teacherProfile()->create([
            'first_name' => 'Admin',
            'last_name' => 'User',
            'phone' => '0123456789',
            'specialization' => 'Administration',
        ]);

        $program = Program::factory()->create(['created_by' => $admin->id]);
        ClassModel::factory()->create(['program_id' => $program->id, 'academic_year' => '2025/2026']);
        ClassModel::factory()->create(['program_id' => $program->id, 'academic_year' => '2026/2027']);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/classes?academic_year=2025/2026');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('2025/2026', $response->json('data.0.academic_year'));
    }

    /**
     * Test: Can filter classes by status
     */
    public function test_can_filter_classes_by_status(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $admin->teacherProfile()->create([
            'first_name' => 'Admin',
            'last_name' => 'User',
            'phone' => '0123456789',
            'specialization' => 'Administration',
        ]);

        $program = Program::factory()->create(['created_by' => $admin->id]);
        ClassModel::factory()->create(['program_id' => $program->id, 'status' => 'planned']);
        ClassModel::factory()->create(['program_id' => $program->id, 'status' => 'ongoing']);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/classes?status=ongoing');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('ongoing', $response->json('data.0.status'));
    }

    /**
     * Test: Teacher can create a class for their program
     */
    public function test_teacher_can_create_class_for_their_program(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $teacher->teacherProfile()->create([
            'first_name' => 'Teacher',
            'last_name' => 'One',
            'phone' => '0123456789',
            'specialization' => 'Math',
        ]);

        $program = Program::factory()->create(['created_by' => $teacher->id]);

        $classData = [
            'program_id' => $program->id,
            'name' => 'Promotion 2025/2026 - Groupe A',
            'academic_year' => '2025/2026',
            'start_date' => now()->addMonth()->format('Y-m-d'),
            'end_date' => now()->addMonths(10)->format('Y-m-d'),
            'max_students' => 25,
            'status' => 'planned',
        ];

        $response = $this->actingAs($teacher, 'sanctum')
            ->postJson('/api/classes', $classData);

        $response->assertStatus(201);
        $response->assertJsonStructure([
            'message',
            'class' => ['id', 'name', 'academic_year', 'program'],
        ]);
        $this->assertDatabaseHas('classes', [
            'name' => 'Promotion 2025/2026 - Groupe A',
            'academic_year' => '2025/2026',
        ]);
    }

    /**
     * Test: Teacher cannot create class for another teacher's program
     */
    public function test_teacher_cannot_create_class_for_another_teachers_program(): void
    {
        $teacher1 = User::factory()->create(['role' => 'teacher']);
        $teacher1->teacherProfile()->create([
            'first_name' => 'Teacher',
            'last_name' => 'One',
            'phone' => '0123456789',
            'specialization' => 'Math',
        ]);

        $teacher2 = User::factory()->create(['role' => 'teacher']);
        $teacher2->teacherProfile()->create([
            'first_name' => 'Teacher',
            'last_name' => 'Two',
            'phone' => '0987654321',
            'specialization' => 'Science',
        ]);

        $program = Program::factory()->create(['created_by' => $teacher2->id]);

        $classData = [
            'program_id' => $program->id,
            'name' => 'Promotion 2025/2026',
            'academic_year' => '2025/2026',
            'start_date' => now()->addMonth()->format('Y-m-d'),
            'end_date' => now()->addMonths(10)->format('Y-m-d'),
            'status' => 'planned',
        ];

        $response = $this->actingAs($teacher1, 'sanctum')
            ->postJson('/api/classes', $classData);

        $response->assertStatus(403);
    }

    /**
     * Test: Admin can create class for any program
     */
    public function test_admin_can_create_class_for_any_program(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $admin->teacherProfile()->create([
            'first_name' => 'Admin',
            'last_name' => 'User',
            'phone' => '0123456789',
            'specialization' => 'Administration',
        ]);

        $teacher = User::factory()->create(['role' => 'teacher']);
        $teacher->teacherProfile()->create([
            'first_name' => 'Teacher',
            'last_name' => 'One',
            'phone' => '0123456789',
            'specialization' => 'Math',
        ]);

        $program = Program::factory()->create(['created_by' => $teacher->id]);

        $classData = [
            'program_id' => $program->id,
            'name' => 'Promotion 2025/2026',
            'academic_year' => '2025/2026',
            'start_date' => now()->addMonth()->format('Y-m-d'),
            'end_date' => now()->addMonths(10)->format('Y-m-d'),
            'max_students' => 30,
            'status' => 'planned',
        ];

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/classes', $classData);

        $response->assertStatus(201);
    }

    /**
     * Test: Validation fails with invalid data
     */
    public function test_validation_fails_with_invalid_data(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $teacher->teacherProfile()->create([
            'first_name' => 'Teacher',
            'last_name' => 'One',
            'phone' => '0123456789',
            'specialization' => 'Math',
        ]);

        $response = $this->actingAs($teacher, 'sanctum')
            ->postJson('/api/classes', [
                'name' => 'Test Class',
                // Missing required fields
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['program_id', 'academic_year', 'start_date', 'end_date']);
    }

    /**
     * Test: Academic year must have correct format
     */
    public function test_academic_year_must_have_correct_format(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $teacher->teacherProfile()->create([
            'first_name' => 'Teacher',
            'last_name' => 'One',
            'phone' => '0123456789',
            'specialization' => 'Math',
        ]);

        $program = Program::factory()->create(['created_by' => $teacher->id]);

        $classData = [
            'program_id' => $program->id,
            'name' => 'Test Class',
            'academic_year' => '2025-2026', // Wrong format
            'start_date' => now()->addMonth()->format('Y-m-d'),
            'end_date' => now()->addMonths(10)->format('Y-m-d'),
        ];

        $response = $this->actingAs($teacher, 'sanctum')
            ->postJson('/api/classes', $classData);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['academic_year']);
    }

    /**
     * Test: End date must be after start date
     */
    public function test_end_date_must_be_after_start_date(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $teacher->teacherProfile()->create([
            'first_name' => 'Teacher',
            'last_name' => 'One',
            'phone' => '0123456789',
            'specialization' => 'Math',
        ]);

        $program = Program::factory()->create(['created_by' => $teacher->id]);

        $classData = [
            'program_id' => $program->id,
            'name' => 'Test Class',
            'academic_year' => '2025/2026',
            'start_date' => now()->addMonths(10)->format('Y-m-d'),
            'end_date' => now()->addMonth()->format('Y-m-d'), // Before start date
        ];

        $response = $this->actingAs($teacher, 'sanctum')
            ->postJson('/api/classes', $classData);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['end_date']);
    }

    /**
     * Test: Can view class details
     */
    public function test_can_view_class_details(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $teacher->teacherProfile()->create([
            'first_name' => 'Teacher',
            'last_name' => 'One',
            'phone' => '0123456789',
            'specialization' => 'Math',
        ]);

        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);

        $response = $this->actingAs($teacher, 'sanctum')
            ->getJson("/api/classes/{$class->id}");

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'class' => ['id', 'name', 'academic_year', 'program', 'enrolled_students_count'],
        ]);
    }

    /**
     * Test: Can update class
     */
    public function test_can_update_class(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $teacher->teacherProfile()->create([
            'first_name' => 'Teacher',
            'last_name' => 'One',
            'phone' => '0123456789',
            'specialization' => 'Math',
        ]);

        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);

        $updateData = [
            'name' => 'Updated Class Name',
            'status' => 'ongoing',
        ];

        $response = $this->actingAs($teacher, 'sanctum')
            ->putJson("/api/classes/{$class->id}", $updateData);

        $response->assertStatus(200);
        $this->assertDatabaseHas('classes', [
            'id' => $class->id,
            'name' => 'Updated Class Name',
            'status' => 'ongoing',
        ]);
    }

    /**
     * Test: Cannot delete class with active enrollments
     */
    public function test_cannot_delete_class_with_active_enrollments(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $teacher->teacherProfile()->create([
            'first_name' => 'Teacher',
            'last_name' => 'One',
            'phone' => '0123456789',
            'specialization' => 'Math',
        ]);

        $student = User::factory()->create(['role' => 'student']);
        $student->studentProfile()->create([
            'first_name' => 'Student',
            'last_name' => 'One',
            'phone' => '0123456789',
        ]);

        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);

        // Create active enrollment
        Enrollment::factory()->create([
            'student_id' => $student->id,
            'class_id' => $class->id,
            'status' => 'active',
        ]);

        $response = $this->actingAs($teacher, 'sanctum')
            ->deleteJson("/api/classes/{$class->id}");

        $response->assertStatus(422);
        $response->assertJson(['message' => 'Impossible de supprimer cette classe car des élèves y sont encore inscrits.']);
    }

    /**
     * Test: Can delete class without enrollments
     */
    public function test_can_delete_class_without_enrollments(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $teacher->teacherProfile()->create([
            'first_name' => 'Teacher',
            'last_name' => 'One',
            'phone' => '0123456789',
            'specialization' => 'Math',
        ]);

        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);

        $response = $this->actingAs($teacher, 'sanctum')
            ->deleteJson("/api/classes/{$class->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('classes', ['id' => $class->id]);
    }

    /**
     * Test: Can get students of a class
     */
    public function test_can_get_students_of_class(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $teacher->teacherProfile()->create([
            'first_name' => 'Teacher',
            'last_name' => 'One',
            'phone' => '0123456789',
            'specialization' => 'Math',
        ]);

        $student = User::factory()->create(['role' => 'student']);
        $student->studentProfile()->create([
            'first_name' => 'Student',
            'last_name' => 'One',
            'phone' => '0123456789',
        ]);

        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);

        Enrollment::factory()->create([
            'student_id' => $student->id,
            'class_id' => $class->id,
            'status' => 'active',
        ]);

        $response = $this->actingAs($teacher, 'sanctum')
            ->getJson("/api/classes/{$class->id}/students");

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'students' => [
                '*' => ['id', 'email', 'student_profile'],
            ],
        ]);
        $this->assertCount(1, $response->json('students'));
    }
}
