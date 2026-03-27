<?php

declare(strict_types=1);

namespace Tests\Feature\Middleware;

use App\Models\StudentProfile;
use App\Models\TeacherProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RoleMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Create test routes for different roles
        Route::middleware(['auth:sanctum', 'role:student'])->get('/api/test/student', function () {
            return response()->json(['message' => 'Student access granted']);
        });

        Route::middleware(['auth:sanctum', 'role:teacher'])->get('/api/test/teacher', function () {
            return response()->json(['message' => 'Teacher access granted']);
        });

        Route::middleware(['auth:sanctum', 'role:admin'])->get('/api/test/admin', function () {
            return response()->json(['message' => 'Admin access granted']);
        });
    }

    public function test_student_can_access_student_route(): void
    {
        $user = User::factory()->create(['role' => 'student']);
        StudentProfile::factory()->create(['user_id' => $user->id]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/test/student');

        $response->assertStatus(200)
            ->assertJson(['message' => 'Student access granted']);
    }

    public function test_teacher_can_access_student_route(): void
    {
        $user = User::factory()->create(['role' => 'teacher']);
        TeacherProfile::factory()->create(['user_id' => $user->id]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/test/student');

        $response->assertStatus(200)
            ->assertJson(['message' => 'Student access granted']);
    }

    public function test_admin_can_access_student_route(): void
    {
        $user = User::factory()->create(['role' => 'admin']);
        TeacherProfile::factory()->create(['user_id' => $user->id]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/test/student');

        $response->assertStatus(200)
            ->assertJson(['message' => 'Student access granted']);
    }

    public function test_teacher_can_access_teacher_route(): void
    {
        $user = User::factory()->create(['role' => 'teacher']);
        TeacherProfile::factory()->create(['user_id' => $user->id]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/test/teacher');

        $response->assertStatus(200)
            ->assertJson(['message' => 'Teacher access granted']);
    }

    public function test_admin_can_access_teacher_route(): void
    {
        $user = User::factory()->create(['role' => 'admin']);
        TeacherProfile::factory()->create(['user_id' => $user->id]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/test/teacher');

        $response->assertStatus(200)
            ->assertJson(['message' => 'Teacher access granted']);
    }

    public function test_student_cannot_access_teacher_route(): void
    {
        $user = User::factory()->create(['role' => 'student']);
        StudentProfile::factory()->create(['user_id' => $user->id]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/test/teacher');

        $response->assertStatus(403)
            ->assertJson(['message' => 'Accès non autorisé. Permissions insuffisantes.']);
    }

    public function test_student_cannot_access_admin_route(): void
    {
        $user = User::factory()->create(['role' => 'student']);
        StudentProfile::factory()->create(['user_id' => $user->id]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/test/admin');

        $response->assertStatus(403)
            ->assertJson(['message' => 'Accès non autorisé. Permissions insuffisantes.']);
    }

    public function test_teacher_cannot_access_admin_route(): void
    {
        $user = User::factory()->create(['role' => 'teacher']);
        TeacherProfile::factory()->create(['user_id' => $user->id]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/test/admin');

        $response->assertStatus(403)
            ->assertJson(['message' => 'Accès non autorisé. Permissions insuffisantes.']);
    }

    public function test_admin_can_access_admin_route(): void
    {
        $user = User::factory()->create(['role' => 'admin']);
        TeacherProfile::factory()->create(['user_id' => $user->id]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/test/admin');

        $response->assertStatus(200)
            ->assertJson(['message' => 'Admin access granted']);
    }

    public function test_unauthenticated_user_cannot_access_protected_routes(): void
    {
        $response = $this->getJson('/api/test/student');
        $response->assertStatus(401);

        $response = $this->getJson('/api/test/teacher');
        $response->assertStatus(401);

        $response = $this->getJson('/api/test/admin');
        $response->assertStatus(401);
    }
}
