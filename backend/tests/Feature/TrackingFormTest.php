<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\ClassModel;
use App\Models\Enrollment;
use App\Models\Program;
use App\Models\TrackingForm;
use App\Models\TrackingFormAssignment;
use App\Models\TrackingFormQuestion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TrackingFormTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test admin can list tracking forms.
     */
    public function test_admin_can_list_tracking_forms(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        TrackingForm::factory()->count(3)->create(['created_by' => $admin->id]);

        $response = $this->actingAs($admin)
            ->getJson('/api/admin/tracking-forms');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'forms' => [
                    'data' => [
                        '*' => [
                            'id',
                            'title',
                            'description',
                            'is_active',
                            'assignments_count',
                        ],
                    ],
                ],
            ]);
    }

    /**
     * Test admin can create tracking form with questions.
     */
    public function test_admin_can_create_tracking_form(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)
            ->postJson('/api/admin/tracking-forms', [
                'title' => 'Suivi mensuel',
                'description' => 'Formulaire de suivi mensuel',
                'questions' => [
                    [
                        'question' => 'Comment vous sentez-vous?',
                        'type' => 'text',
                        'required' => true,
                    ],
                    [
                        'question' => 'Niveau de satisfaction?',
                        'type' => 'multiple_choice',
                        'options' => ['Très satisfait', 'Satisfait', 'Neutre', 'Insatisfait'],
                        'required' => true,
                    ],
                ],
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'message' => 'Formulaire créé avec succès.',
            ]);

        $this->assertDatabaseHas('tracking_forms', [
            'title' => 'Suivi mensuel',
            'created_by' => $admin->id,
        ]);

        $this->assertDatabaseCount('tracking_form_questions', 2);
    }

    /**
     * Test tracking form requires title and questions.
     */
    public function test_tracking_form_requires_title_and_questions(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)
            ->postJson('/api/admin/tracking-forms', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['title', 'questions']);
    }

    /**
     * Test admin can view tracking form details.
     */
    public function test_admin_can_view_tracking_form_details(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $form = TrackingForm::factory()->create(['created_by' => $admin->id]);
        TrackingFormQuestion::create([
            'form_id' => $form->id,
            'question' => 'Test question?',
            'type' => 'text',
            'order' => 0,
            'required' => true,
        ]);

        $response = $this->actingAs($admin)
            ->getJson("/api/admin/tracking-forms/{$form->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'form' => [
                    'id',
                    'title',
                    'questions',
                ],
            ]);
    }

    /**
     * Test admin can update tracking form.
     */
    public function test_admin_can_update_tracking_form(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $form = TrackingForm::factory()->create(['created_by' => $admin->id]);

        $response = $this->actingAs($admin)
            ->putJson("/api/admin/tracking-forms/{$form->id}", [
                'title' => 'Updated Title',
                'description' => 'Updated description',
            ]);

        $response->assertStatus(200);

        $form->refresh();
        $this->assertEquals('Updated Title', $form->title);
    }

    /**
     * Test cannot update questions if responses exist.
     */
    public function test_cannot_update_questions_with_existing_responses(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);

        $form = TrackingForm::factory()->create(['created_by' => $admin->id]);
        TrackingFormQuestion::create([
            'form_id' => $form->id,
            'question' => 'Test question?',
            'type' => 'text',
            'order' => 0,
            'required' => true,
        ]);

        // Create completed assignment
        TrackingFormAssignment::create([
            'form_id' => $form->id,
            'student_id' => $student->id,
            'completed_at' => now(),
        ]);

        $response = $this->actingAs($admin)
            ->putJson("/api/admin/tracking-forms/{$form->id}", [
                'questions' => [
                    [
                        'question' => 'New question?',
                        'type' => 'text',
                        'required' => true,
                    ],
                ],
            ]);

        $response->assertStatus(422)
            ->assertJson([
                'message' => 'Impossible de modifier les questions car des réponses ont déjà été soumises.',
            ]);
    }

    /**
     * Test admin can delete tracking form.
     */
    public function test_admin_can_delete_tracking_form(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $form = TrackingForm::factory()->create(['created_by' => $admin->id]);

        $response = $this->actingAs($admin)
            ->deleteJson("/api/admin/tracking-forms/{$form->id}");

        $response->assertStatus(200);

        $this->assertDatabaseMissing('tracking_forms', ['id' => $form->id]);
    }

    /**
     * Test admin can toggle tracking form active status.
     */
    public function test_admin_can_toggle_form_active_status(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $form = TrackingForm::factory()->create([
            'created_by' => $admin->id,
            'is_active' => true,
        ]);

        $response = $this->actingAs($admin)
            ->postJson("/api/admin/tracking-forms/{$form->id}/toggle-active");

        $response->assertStatus(200);

        $form->refresh();
        $this->assertFalse($form->is_active);
    }

    /**
     * Test admin can assign form to students.
     */
    public function test_admin_can_assign_form_to_students(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $student1 = User::factory()->create(['role' => 'student']);
        $student2 = User::factory()->create(['role' => 'student']);

        $form = TrackingForm::factory()->create([
            'created_by' => $admin->id,
            'is_active' => true,
        ]);

        $response = $this->actingAs($admin)
            ->postJson("/api/admin/tracking-forms/{$form->id}/assign", [
                'student_ids' => [$student1->id, $student2->id],
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'assigned_count' => 2,
            ]);

        $this->assertDatabaseHas('tracking_form_assignments', [
            'form_id' => $form->id,
            'student_id' => $student1->id,
        ]);
    }

    /**
     * Test admin can assign form to class.
     */
    public function test_admin_can_assign_form_to_class(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $student = User::factory()->create(['role' => 'student']);

        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);

        // Enroll student
        Enrollment::factory()->create([
            'student_id' => $student->id,
            'class_id' => $class->id,
            'status' => 'active',
        ]);

        $form = TrackingForm::factory()->create([
            'created_by' => $admin->id,
            'is_active' => true,
        ]);

        $response = $this->actingAs($admin)
            ->postJson("/api/admin/tracking-forms/{$form->id}/assign", [
                'class_id' => $class->id,
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'assigned_count' => 1,
            ]);
    }

    /**
     * Test cannot assign inactive form.
     */
    public function test_cannot_assign_inactive_form(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);

        $form = TrackingForm::factory()->inactive()->create([
            'created_by' => $admin->id,
        ]);

        $response = $this->actingAs($admin)
            ->postJson("/api/admin/tracking-forms/{$form->id}/assign", [
                'student_ids' => [$student->id],
            ]);

        $response->assertStatus(422)
            ->assertJson([
                'message' => 'Ce formulaire est désactivé et ne peut pas être envoyé.',
            ]);
    }

    /**
     * Test admin can view form assignments.
     */
    public function test_admin_can_view_form_assignments(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);

        $form = TrackingForm::factory()->create(['created_by' => $admin->id]);

        TrackingFormAssignment::create([
            'form_id' => $form->id,
            'student_id' => $student->id,
        ]);

        $response = $this->actingAs($admin)
            ->getJson("/api/admin/tracking-forms/{$form->id}/assignments");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'assignments' => [
                    '*' => [
                        'id',
                        'form_id',
                        'student_id',
                        'student',
                    ],
                ],
            ]);
    }

    /**
     * Test admin can get available students.
     */
    public function test_admin_can_get_available_students(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        User::factory()->count(3)->create(['role' => 'student']);

        $response = $this->actingAs($admin)
            ->getJson('/api/admin/tracking-forms/students');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'students' => [
                    '*' => ['id', 'email', 'first_name', 'last_name'],
                ],
            ]);
    }

    /**
     * Test student cannot access admin tracking forms endpoints.
     */
    public function test_student_cannot_access_admin_tracking_forms(): void
    {
        $student = User::factory()->create(['role' => 'student']);

        $response = $this->actingAs($student)
            ->getJson('/api/admin/tracking-forms');

        $response->assertStatus(403);
    }

    /**
     * Test teacher cannot access admin tracking forms endpoints.
     */
    public function test_teacher_cannot_access_admin_tracking_forms(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);

        $response = $this->actingAs($teacher)
            ->getJson('/api/admin/tracking-forms');

        $response->assertStatus(403);
    }

    /**
     * Test unauthenticated cannot access tracking forms.
     */
    public function test_unauthenticated_cannot_access_tracking_forms(): void
    {
        $response = $this->getJson('/api/admin/tracking-forms');
        $response->assertStatus(401);
    }
}
