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

/**
 * POST /api/admin/quizzes — création d'un quiz et notification des élèves.
 */
class QuizStoreTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private ClassModel $class;

    private Session $session;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin']);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $this->class = ClassModel::factory()->create(['program_id' => $program->id]);
        $this->session = Session::factory()->create([
            'class_id' => $this->class->id,
            'teacher_id' => $teacher->id,
            'title' => 'Séance du dimanche',
        ]);
    }

    private function payload(): array
    {
        return [
            'session_id' => $this->session->id,
            'class_id' => $this->class->id,
            'title' => 'Le Qurān',
            'questions' => [
                [
                    'question_text' => 'Q1',
                    'type' => 'multiple_choice',
                    'options' => [
                        ['option_text' => 'Bonne', 'is_correct' => true],
                        ['option_text' => 'Mauvaise', 'is_correct' => false],
                    ],
                ],
            ],
        ];
    }

    /**
     * La notification mène directement au quiz : la page Supports ne l'affichait
     * que sur la ligne d'un support de la même séance, donc jamais pour une
     * séance sans support (cas réel du 07/10/2026).
     */
    public function test_creating_a_quiz_notifies_active_students_with_a_link_to_the_quiz(): void
    {
        $active = User::factory()->create(['role' => 'student']);
        Enrollment::factory()->create(['student_id' => $active->id, 'class_id' => $this->class->id, 'status' => 'active']);
        $inactive = User::factory()->create(['role' => 'student']);
        Enrollment::factory()->create(['student_id' => $inactive->id, 'class_id' => $this->class->id, 'status' => 'cancelled']);

        $response = $this->actingAs($this->admin)->postJson('/api/admin/quizzes', $this->payload());

        $response->assertCreated()->assertJsonPath('quiz.title', 'Le Qurān');
        $quizId = $response->json('quiz.id');

        $this->assertDatabaseHas('notifications', [
            'user_id' => $active->id,
            'type' => 'quiz',
            'action_url' => "/student/quiz/{$quizId}",
        ]);
        $this->assertDatabaseMissing('notifications', [
            'user_id' => $inactive->id,
            'type' => 'quiz',
        ]);
    }

    public function test_only_one_quiz_per_session_and_class(): void
    {
        $this->actingAs($this->admin)->postJson('/api/admin/quizzes', $this->payload())->assertCreated();

        $this->actingAs($this->admin)->postJson('/api/admin/quizzes', $this->payload())->assertStatus(422);
    }

    public function test_student_cannot_create_a_quiz(): void
    {
        $student = User::factory()->create(['role' => 'student']);

        $this->actingAs($student)->postJson('/api/admin/quizzes', $this->payload())->assertForbidden();
    }
}
