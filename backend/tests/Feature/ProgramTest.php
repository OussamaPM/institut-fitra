<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Program;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProgramTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test that anyone can view active programs.
     */
    public function test_anyone_can_view_active_programs(): void
    {
        Program::factory()->count(3)->create(['active' => true]);
        Program::factory()->count(2)->create(['active' => false]);

        $response = $this->getJson('/api/programs');

        $response->assertStatus(200)
            ->assertJsonCount(3, 'programs.data');
    }

    /**
     * Test that authenticated users can view program details.
     */
    public function test_authenticated_users_can_view_program_details(): void
    {
        $program = Program::factory()->create(['active' => true]);

        $response = $this->getJson("/api/programs/{$program->id}");

        $response->assertStatus(200)
            ->assertJsonPath('program.id', $program->id)
            ->assertJsonPath('program.name', $program->name);
    }

    /**
     * Test that teachers can create programs.
     */
    public function test_teacher_can_create_program(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $teacher->teacherProfile()->create([
            'first_name' => 'Teacher',
            'last_name' => 'Test',
            'phone' => '0123456789',
            'specialization' => 'Math',
        ]);

        $programData = [
            'name' => 'Programme de Mathématiques',
            'description' => 'Un programme complet de mathématiques',
            'subject' => 'Mathématiques',
            'subject_description' => 'Cours de mathématiques niveau avancé',
            'enrollment_conditions' => 'Aucun prérequis',
            'price' => 500.00,
            'max_installments' => 3,
            'active' => true,
            'teacher_id' => $teacher->id,
            'schedule' => [
                ['day' => 'lundi', 'start_time' => '09:00', 'end_time' => '11:00'],
            ],
        ];

        $response = $this->actingAs($teacher)
            ->postJson('/api/programs', $programData);

        $response->assertStatus(201)
            ->assertJsonPath('program.name', 'Programme de Mathématiques')
            ->assertJsonPath('program.created_by', $teacher->id);

        $this->assertDatabaseHas('programs', [
            'name' => 'Programme de Mathématiques',
            'created_by' => $teacher->id,
        ]);
    }

    /**
     * Test that students cannot create programs.
     */
    public function test_student_cannot_create_program(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        $teacher = User::factory()->create(['role' => 'teacher']);

        $programData = [
            'name' => 'Programme Test',
            'description' => 'Description',
            'subject' => 'Test',
            'subject_description' => 'Test description',
            'enrollment_conditions' => 'None',
            'price' => 100.00,
            'max_installments' => 1,
            'teacher_id' => $teacher->id,
            'schedule' => [['day' => 'lundi', 'start_time' => '09:00', 'end_time' => '11:00']],
        ];

        $response = $this->actingAs($student)
            ->postJson('/api/programs', $programData);

        $response->assertStatus(403);
    }

    /**
     * Test program creation validation.
     */
    public function test_program_creation_requires_valid_data(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);

        $response = $this->actingAs($teacher)
            ->postJson('/api/programs', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'description', 'subject', 'price', 'max_installments', 'teacher_id', 'schedule']);
    }

    /**
     * Test that program creator can update their program.
     */
    public function test_program_creator_can_update_their_program(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher->id]);

        $updatedData = [
            'name' => 'Programme Mis à Jour',
            'description' => $program->description,
            'subject' => $program->subject,
            'subject_description' => $program->subject_description,
            'enrollment_conditions' => $program->enrollment_conditions,
            'price' => $program->price,
            'max_installments' => $program->max_installments,
            'teacher_id' => $program->teacher_id,
            'schedule' => $program->schedule,
        ];

        $response = $this->actingAs($teacher)
            ->putJson("/api/programs/{$program->id}", $updatedData);

        $response->assertStatus(200)
            ->assertJsonPath('program.name', 'Programme Mis à Jour');

        $this->assertDatabaseHas('programs', [
            'id' => $program->id,
            'name' => 'Programme Mis à Jour',
        ]);
    }

    /**
     * Test that other teachers cannot update another teacher's program.
     */
    public function test_teacher_cannot_update_another_teachers_program(): void
    {
        $teacher1 = User::factory()->create(['role' => 'teacher']);
        $teacher2 = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher1->id]);

        $updatedData = [
            'name' => 'Tentative de Modification',
            'description' => $program->description,
            'subject' => $program->subject,
            'subject_description' => $program->subject_description,
            'enrollment_conditions' => $program->enrollment_conditions,
            'price' => $program->price,
            'max_installments' => $program->max_installments,
            'teacher_id' => $program->teacher_id,
            'schedule' => $program->schedule,
        ];

        $response = $this->actingAs($teacher2)
            ->putJson("/api/programs/{$program->id}", $updatedData);

        $response->assertStatus(403);
    }

    /**
     * Test that admin can update any program.
     */
    public function test_admin_can_update_any_program(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $admin->teacherProfile()->create([
            'first_name' => 'Admin',
            'last_name' => 'User',
            'phone' => '0123456789',
            'specialization' => 'Administration',
        ]);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher->id]);

        $updatedData = [
            'name' => 'Modifié par Admin',
            'description' => $program->description,
            'subject' => $program->subject,
            'subject_description' => $program->subject_description,
            'enrollment_conditions' => $program->enrollment_conditions,
            'price' => $program->price,
            'max_installments' => $program->max_installments,
            'teacher_id' => $program->teacher_id,
            'schedule' => $program->schedule,
        ];

        $response = $this->actingAs($admin)
            ->putJson("/api/programs/{$program->id}", $updatedData);

        $response->assertStatus(200)
            ->assertJsonPath('program.name', 'Modifié par Admin');
    }

    /**
     * Test that program creator can delete their program.
     */
    public function test_program_creator_can_delete_their_program(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher->id]);

        $response = $this->actingAs($teacher)
            ->deleteJson("/api/programs/{$program->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('programs', ['id' => $program->id]);
    }

    /**
     * Test that teacher cannot delete another teacher's program.
     */
    public function test_teacher_cannot_delete_another_teachers_program(): void
    {
        $teacher1 = User::factory()->create(['role' => 'teacher']);
        $teacher2 = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher1->id]);

        $response = $this->actingAs($teacher2)
            ->deleteJson("/api/programs/{$program->id}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('programs', ['id' => $program->id]);
    }

    /**
     * Test that admin can delete any program.
     */
    public function test_admin_can_delete_any_program(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher->id]);

        $response = $this->actingAs($admin)
            ->deleteJson("/api/programs/{$program->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('programs', ['id' => $program->id]);
    }

    /**
     * Test that admins see inactive programs in list.
     */
    public function test_admin_sees_inactive_programs(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Program::factory()->count(2)->create(['active' => true]);
        Program::factory()->count(3)->create(['active' => false]);

        $response = $this->actingAs($admin)
            ->getJson('/api/programs');

        $response->assertStatus(200)
            ->assertJsonCount(5, 'programs.data');
    }
}
