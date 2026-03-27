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

class ReplayTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test admin can add replay to session.
     */
    public function test_admin_can_add_replay_to_session(): void
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
            ->putJson("/api/sessions/{$session->id}", [
                'replay_url' => 'https://player.vimeo.com/video/123456789',
                'replay_validity_days' => 30,
            ]);

        $response->assertStatus(200);

        $session->refresh();
        $this->assertEquals('https://player.vimeo.com/video/123456789', $session->replay_url);
        $this->assertEquals(30, $session->replay_validity_days);
        $this->assertNotNull($session->replay_added_at);
    }

    /**
     * Test teacher can add replay to their session.
     */
    public function test_teacher_can_add_replay_to_own_session(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);
        $session = Session::factory()->create([
            'class_id' => $class->id,
            'teacher_id' => $teacher->id,
        ]);

        $response = $this->actingAs($teacher)
            ->putJson("/api/sessions/{$session->id}", [
                'replay_url' => 'https://player.vimeo.com/video/987654321',
                'replay_validity_days' => 15,
            ]);

        $response->assertStatus(200);

        $session->refresh();
        $this->assertNotNull($session->replay_url);
    }

    /**
     * Test replay validity days must be between 1 and 365.
     */
    public function test_replay_validity_must_be_valid(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);
        $session = Session::factory()->create([
            'class_id' => $class->id,
            'teacher_id' => $teacher->id,
        ]);

        // Test below minimum
        $response = $this->actingAs($admin)
            ->putJson("/api/sessions/{$session->id}", [
                'replay_url' => 'https://player.vimeo.com/video/123456789',
                'replay_validity_days' => 0,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['replay_validity_days']);

        // Test above maximum
        $response = $this->actingAs($admin)
            ->putJson("/api/sessions/{$session->id}", [
                'replay_url' => 'https://player.vimeo.com/video/123456789',
                'replay_validity_days' => 400,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['replay_validity_days']);
    }

    /**
     * Test can remove replay from session.
     */
    public function test_can_remove_replay_from_session(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);
        $session = Session::factory()->create([
            'class_id' => $class->id,
            'teacher_id' => $teacher->id,
            'replay_url' => 'https://player.vimeo.com/video/123456789',
            'replay_validity_days' => 30,
            'replay_added_at' => now(),
        ]);

        $response = $this->actingAs($admin)
            ->putJson("/api/sessions/{$session->id}", [
                'replay_url' => null,
            ]);

        $response->assertStatus(200);

        $session->refresh();
        $this->assertNull($session->replay_url);
    }

    /**
     * Test session includes replay_valid and replay_expires_at.
     */
    public function test_session_includes_replay_computed_fields(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);
        $session = Session::factory()->create([
            'class_id' => $class->id,
            'teacher_id' => $teacher->id,
            'replay_url' => 'https://player.vimeo.com/video/123456789',
            'replay_validity_days' => 30,
            'replay_added_at' => now(),
        ]);

        $response = $this->actingAs($admin)
            ->getJson("/api/sessions/{$session->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'session' => [
                    'id',
                    'replay_url',
                    'replay_validity_days',
                    'replay_added_at',
                    'replay_expires_at',
                    'replay_valid',
                ],
            ]);
    }

    /**
     * Test expired replay shows as invalid.
     */
    public function test_expired_replay_shows_invalid(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);

        // Create session with expired replay (added 31 days ago, valid for 30)
        $session = Session::factory()->create([
            'class_id' => $class->id,
            'teacher_id' => $teacher->id,
            'replay_url' => 'https://player.vimeo.com/video/123456789',
            'replay_validity_days' => 30,
            'replay_added_at' => now()->subDays(31),
        ]);

        $response = $this->actingAs($admin)
            ->getJson("/api/sessions/{$session->id}");

        $response->assertStatus(200);

        $sessionData = $response->json('session');
        $this->assertFalse($sessionData['replay_valid']);
    }

    /**
     * Test valid replay shows as valid.
     */
    public function test_valid_replay_shows_valid(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);

        // Create session with valid replay (added today, valid for 30)
        $session = Session::factory()->create([
            'class_id' => $class->id,
            'teacher_id' => $teacher->id,
            'replay_url' => 'https://player.vimeo.com/video/123456789',
            'replay_validity_days' => 30,
            'replay_added_at' => now(),
        ]);

        $response = $this->actingAs($admin)
            ->getJson("/api/sessions/{$session->id}");

        $response->assertStatus(200);

        $sessionData = $response->json('session');
        $this->assertTrue($sessionData['replay_valid']);
    }

    /**
     * Test student can see replay in session details.
     */
    public function test_student_can_see_replay_in_session(): void
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

        $session = Session::factory()->create([
            'class_id' => $class->id,
            'teacher_id' => $teacher->id,
            'replay_url' => 'https://player.vimeo.com/video/123456789',
            'replay_validity_days' => 30,
            'replay_added_at' => now(),
        ]);

        $response = $this->actingAs($student)
            ->getJson("/api/sessions/{$session->id}");

        $response->assertStatus(200);

        $sessionData = $response->json('session');
        $this->assertNotNull($sessionData['replay_url']);
    }

    /**
     * Test student cannot add replay.
     */
    public function test_student_cannot_add_replay(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);
        $session = Session::factory()->create([
            'class_id' => $class->id,
            'teacher_id' => $teacher->id,
        ]);

        $response = $this->actingAs($student)
            ->putJson("/api/sessions/{$session->id}", [
                'replay_url' => 'https://player.vimeo.com/video/123456789',
                'replay_validity_days' => 30,
            ]);

        $response->assertStatus(403);
    }

    /**
     * Test teacher cannot add replay to another teacher's session.
     */
    public function test_teacher_cannot_add_replay_to_other_session(): void
    {
        $teacher1 = User::factory()->create(['role' => 'teacher']);
        $teacher2 = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher1->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);
        $session = Session::factory()->create([
            'class_id' => $class->id,
            'teacher_id' => $teacher1->id,
        ]);

        $response = $this->actingAs($teacher2)
            ->putJson("/api/sessions/{$session->id}", [
                'replay_url' => 'https://player.vimeo.com/video/123456789',
                'replay_validity_days' => 30,
            ]);

        $response->assertStatus(403);
    }
}
