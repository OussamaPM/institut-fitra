<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\ClassModel;
use App\Models\Enrollment;
use App\Models\Program;
use App\Models\Session;
use App\Models\SessionMaterial;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SessionMaterialTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    /**
     * Test admin can upload material to session.
     */
    public function test_admin_can_upload_material(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);
        $session = Session::factory()->create([
            'class_id' => $class->id,
            'teacher_id' => $teacher->id,
        ]);

        $file = UploadedFile::fake()->create('document.pdf', 1000, 'application/pdf');

        $response = $this->actingAs($admin)
            ->postJson("/api/sessions/{$session->id}/materials", [
                'title' => 'Cours PDF',
                'file' => $file,
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'message',
                'material' => [
                    'id',
                    'title',
                    'file_type',
                    'file_path',
                ],
            ]);

        $this->assertDatabaseHas('session_materials', [
            'session_id' => $session->id,
            'title' => 'Cours PDF',
        ]);
    }

    /**
     * Test teacher can upload material to their session.
     */
    public function test_teacher_can_upload_material_to_own_session(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);
        $session = Session::factory()->create([
            'class_id' => $class->id,
            'teacher_id' => $teacher->id,
        ]);

        $file = UploadedFile::fake()->create('cours.pdf', 1000, 'application/pdf');

        $response = $this->actingAs($teacher)
            ->postJson("/api/sessions/{$session->id}/materials", [
                'title' => 'Document cours',
                'file' => $file,
            ]);

        $response->assertStatus(201);
    }

    /**
     * Test material requires file.
     */
    public function test_material_requires_file(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);
        $session = Session::factory()->create([
            'class_id' => $class->id,
            'teacher_id' => $teacher->id,
        ]);

        $response = $this->actingAs($admin)
            ->postJson("/api/sessions/{$session->id}/materials", [
                'title' => 'Test Title',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    /**
     * Test material requires title.
     */
    public function test_material_requires_title(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);
        $session = Session::factory()->create([
            'class_id' => $class->id,
            'teacher_id' => $teacher->id,
        ]);

        $file = UploadedFile::fake()->create('document.pdf', 1000, 'application/pdf');

        $response = $this->actingAs($admin)
            ->postJson("/api/sessions/{$session->id}/materials", [
                'file' => $file,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['title']);
    }

    /**
     * Test admin can list all materials.
     */
    public function test_admin_can_list_all_materials(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);
        $session = Session::factory()->create([
            'class_id' => $class->id,
            'teacher_id' => $teacher->id,
        ]);

        SessionMaterial::factory()->count(3)->create([
            'session_id' => $session->id,
            'uploaded_by' => $admin->id,
        ]);

        $response = $this->actingAs($admin)
            ->getJson('/api/materials');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'materials' => [
                    'data' => [
                        '*' => ['id', 'title', 'file_type', 'session_id'],
                    ],
                ],
            ]);
    }

    /**
     * Test admin can delete material.
     */
    public function test_admin_can_delete_material(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);
        $session = Session::factory()->create([
            'class_id' => $class->id,
            'teacher_id' => $teacher->id,
        ]);

        $material = SessionMaterial::factory()->create([
            'session_id' => $session->id,
            'uploaded_by' => $admin->id,
        ]);

        $response = $this->actingAs($admin)
            ->deleteJson("/api/materials/{$material->id}");

        $response->assertStatus(200);

        $this->assertDatabaseMissing('session_materials', ['id' => $material->id]);
    }

    /**
     * Test student can view materials of enrolled sessions.
     */
    public function test_student_can_view_enrolled_session_materials(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);
        $session = Session::factory()->create([
            'class_id' => $class->id,
            'teacher_id' => $teacher->id,
        ]);

        // Enroll student
        Enrollment::factory()->create([
            'student_id' => $student->id,
            'class_id' => $class->id,
            'status' => 'active',
        ]);

        SessionMaterial::factory()->create([
            'session_id' => $session->id,
            'uploaded_by' => $teacher->id,
        ]);

        $response = $this->actingAs($student)
            ->getJson('/api/student/materials');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'materials' => [
                    '*' => ['id', 'title', 'file_type'],
                ],
            ]);
    }

    /**
     * Test student can view materials of specific session.
     */
    public function test_student_can_view_session_materials(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);
        $session = Session::factory()->create([
            'class_id' => $class->id,
            'teacher_id' => $teacher->id,
        ]);

        // Enroll student
        Enrollment::factory()->create([
            'student_id' => $student->id,
            'class_id' => $class->id,
            'status' => 'active',
        ]);

        SessionMaterial::factory()->create([
            'session_id' => $session->id,
            'uploaded_by' => $teacher->id,
        ]);

        $response = $this->actingAs($student)
            ->getJson("/api/sessions/{$session->id}/materials");

        $response->assertStatus(200);
    }

    /**
     * Test student cannot upload materials.
     */
    public function test_student_cannot_upload_materials(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);
        $session = Session::factory()->create([
            'class_id' => $class->id,
            'teacher_id' => $teacher->id,
        ]);

        $file = UploadedFile::fake()->create('document.pdf', 1000, 'application/pdf');

        $response = $this->actingAs($student)
            ->postJson("/api/sessions/{$session->id}/materials", [
                'title' => 'Test',
                'file' => $file,
            ]);

        $response->assertStatus(403);
    }

    /**
     * Test student cannot delete materials.
     */
    public function test_student_cannot_delete_materials(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);
        $session = Session::factory()->create([
            'class_id' => $class->id,
            'teacher_id' => $teacher->id,
        ]);

        $material = SessionMaterial::factory()->create([
            'session_id' => $session->id,
            'uploaded_by' => $teacher->id,
        ]);

        $response = $this->actingAs($student)
            ->deleteJson("/api/materials/{$material->id}");

        $response->assertStatus(403);
    }

    /**
     * Test unauthenticated cannot access materials.
     */
    public function test_unauthenticated_cannot_access_materials(): void
    {
        $response = $this->getJson('/api/materials');
        $response->assertStatus(401);
    }
}
