<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\ClassModel;
use App\Models\Program;
use App\Models\Quiz;
use App\Models\QuizAnswer;
use App\Models\QuizOption;
use App\Models\QuizQuestion;
use App\Models\QuizSubmission;
use App\Models\Session;
use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * GET /api/admin/quizzes/{quiz}/results — consommé par la page admin
 * /admin/quizzes/[id]/results. Le contrat vérifié ici est celui sur lequel
 * la page s'appuie : options avec `is_correct`, session et classe du quiz,
 * profil de l'élève, réponses et score par soumission.
 */
class QuizResultsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $student;

    private Program $program;

    private ClassModel $class;

    private Session $session;

    private Quiz $quiz;

    private QuizQuestion $q1;

    private QuizOption $q1Good;

    private QuizQuestion $q2;

    private QuizOption $q2Bad;

    private QuizQuestion $q3;

    private QuizSubmission $submission;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin']);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $this->program = Program::factory()->create(['created_by' => $teacher->id]);
        $this->class = ClassModel::factory()->create(['program_id' => $this->program->id]);
        $this->session = Session::factory()->create([
            'class_id' => $this->class->id,
            'teacher_id' => $teacher->id,
        ]);

        $this->quiz = Quiz::create([
            'session_id' => $this->session->id,
            'class_id' => $this->class->id,
            'title' => 'Quiz de la séance',
            'created_by' => $this->admin->id,
        ]);

        // Q1 : QCM — Q2 : QCM — Q3 : réponse libre
        $this->q1 = QuizQuestion::create(['quiz_id' => $this->quiz->id, 'question_text' => 'Q1', 'type' => 'multiple_choice', 'order' => 0]);
        $this->q1Good = QuizOption::create(['question_id' => $this->q1->id, 'option_text' => 'Bonne', 'is_correct' => true, 'order' => 0]);
        QuizOption::create(['question_id' => $this->q1->id, 'option_text' => 'Mauvaise', 'is_correct' => false, 'order' => 1]);

        $this->q2 = QuizQuestion::create(['quiz_id' => $this->quiz->id, 'question_text' => 'Q2', 'type' => 'multiple_choice', 'order' => 1]);
        QuizOption::create(['question_id' => $this->q2->id, 'option_text' => 'Bonne', 'is_correct' => true, 'order' => 0]);
        $this->q2Bad = QuizOption::create(['question_id' => $this->q2->id, 'option_text' => 'Mauvaise', 'is_correct' => false, 'order' => 1]);

        $this->q3 = QuizQuestion::create(['quiz_id' => $this->quiz->id, 'question_text' => 'Q3', 'type' => 'free_text', 'order' => 2]);

        // Élève 1 : Q1 juste, Q2 fausse, Q3 répondue
        $this->student = User::factory()->create(['role' => 'student']);
        StudentProfile::factory()->create(['user_id' => $this->student->id, 'gender' => 'female']);

        $this->submission = QuizSubmission::create([
            'quiz_id' => $this->quiz->id,
            'student_id' => $this->student->id,
            'submitted_at' => now(),
        ]);
        QuizAnswer::create(['submission_id' => $this->submission->id, 'question_id' => $this->q1->id, 'selected_option_id' => $this->q1Good->id, 'is_correct' => true]);
        QuizAnswer::create(['submission_id' => $this->submission->id, 'question_id' => $this->q2->id, 'selected_option_id' => $this->q2Bad->id, 'is_correct' => false]);
        QuizAnswer::create(['submission_id' => $this->submission->id, 'question_id' => $this->q3->id, 'free_text_answer' => 'Ma réponse', 'is_correct' => null]);
    }

    public function test_admin_gets_results_with_scores_and_student_profiles(): void
    {
        $response = $this->actingAs($this->admin)
            ->getJson("/api/admin/quizzes/{$this->quiz->id}/results");

        $response->assertOk()
            ->assertJsonPath('submissions_count', 1)
            ->assertJsonPath('quiz.id', $this->quiz->id)
            ->assertJsonPath('quiz.session.id', $this->session->id)
            ->assertJsonPath('quiz.class.program.id', $this->program->id)
            ->assertJsonCount(3, 'quiz.questions')
            ->assertJsonPath('quiz.questions.0.options.0.is_correct', true)
            ->assertJsonPath('submissions.0.student.id', $this->student->id)
            ->assertJsonPath('submissions.0.student.student_profile.gender', 'female')
            ->assertJsonCount(3, 'submissions.0.answers')
            ->assertJsonPath('submissions.0.answers.0.selected_option_id', $this->q1Good->id)
            ->assertJsonPath('submissions.0.answers.2.free_text_answer', 'Ma réponse')
            ->assertJsonPath('submissions.0.score', ['correct' => 1, 'incorrect' => 1, 'total' => 2])
            // Le quiz sert au calcul du score mais n'est pas dupliqué dans chaque soumission
            ->assertJsonMissingPath('submissions.0.quiz');
    }

    /**
     * Un QCM laissé sans réponse (is_correct null, comme le crée
     * StudentQuizController::submit) compte dans le total : l'élève qui ne
     * répond qu'à 1 QCM sur 2 n'est pas à 100 %.
     */
    public function test_unanswered_mcq_counts_against_the_score(): void
    {
        $partial = User::factory()->create(['role' => 'student']);
        $partialSubmission = QuizSubmission::create([
            'quiz_id' => $this->quiz->id,
            'student_id' => $partial->id,
            'submitted_at' => now()->subHour(),
        ]);
        QuizAnswer::create(['submission_id' => $partialSubmission->id, 'question_id' => $this->q1->id, 'selected_option_id' => $this->q1Good->id, 'is_correct' => true]);
        QuizAnswer::create(['submission_id' => $partialSubmission->id, 'question_id' => $this->q2->id, 'selected_option_id' => null, 'is_correct' => null]);
        QuizAnswer::create(['submission_id' => $partialSubmission->id, 'question_id' => $this->q3->id, 'free_text_answer' => null, 'is_correct' => null]);

        $response = $this->actingAs($this->admin)
            ->getJson("/api/admin/quizzes/{$this->quiz->id}/results");

        $response->assertOk()
            ->assertJsonPath('submissions_count', 2)
            // Tri par date de soumission décroissante : la plus récente d'abord
            ->assertJsonPath('submissions.0.student.id', $this->student->id)
            ->assertJsonPath('submissions.1.student.id', $partial->id)
            ->assertJsonPath('submissions.1.student.student_profile', null)
            ->assertJsonPath('submissions.1.score', ['correct' => 1, 'incorrect' => 1, 'total' => 2]);
    }

    public function test_free_text_only_quiz_has_no_score(): void
    {
        $otherSession = Session::factory()->create([
            'class_id' => $this->class->id,
            'teacher_id' => $this->session->teacher_id,
        ]);
        $quiz = Quiz::create([
            'session_id' => $otherSession->id,
            'class_id' => $this->class->id,
            'title' => 'Réflexion libre',
            'created_by' => $this->admin->id,
        ]);
        $question = QuizQuestion::create(['quiz_id' => $quiz->id, 'question_text' => 'Développez', 'type' => 'free_text', 'order' => 0]);
        $submission = QuizSubmission::create(['quiz_id' => $quiz->id, 'student_id' => $this->student->id, 'submitted_at' => now()]);
        QuizAnswer::create(['submission_id' => $submission->id, 'question_id' => $question->id, 'free_text_answer' => 'Texte', 'is_correct' => null]);

        $this->actingAs($this->admin)
            ->getJson("/api/admin/quizzes/{$quiz->id}/results")
            ->assertOk()
            ->assertJsonPath('submissions.0.score', ['correct' => 0, 'incorrect' => 0, 'total' => 0]);
    }

    /** Les routes /admin/quizzes sont dans le groupe role:admin : un professeur est refusé. */
    public function test_teacher_cannot_get_results(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);

        $this->actingAs($teacher)
            ->getJson("/api/admin/quizzes/{$this->quiz->id}/results")
            ->assertForbidden();
    }

    public function test_student_cannot_get_results(): void
    {
        $this->actingAs($this->student)
            ->getJson("/api/admin/quizzes/{$this->quiz->id}/results")
            ->assertForbidden();
    }

    public function test_guest_is_unauthorized(): void
    {
        $this->getJson("/api/admin/quizzes/{$this->quiz->id}/results")
            ->assertUnauthorized();
    }

    public function test_unknown_quiz_returns_404(): void
    {
        $this->actingAs($this->admin)
            ->getJson('/api/admin/quizzes/999999/results')
            ->assertNotFound();
    }
}
