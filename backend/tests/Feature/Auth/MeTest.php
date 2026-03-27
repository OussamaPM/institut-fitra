<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\StudentProfile;
use App\Models\TeacherProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MeTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test authenticated student can get their profile.
     */
    public function test_authenticated_student_can_get_profile(): void
    {
        $user = User::factory()->create(['role' => 'student']);
        StudentProfile::factory()->create([
            'user_id' => $user->id,
            'first_name' => 'John',
            'last_name' => 'Doe',
        ]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/auth/me');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'user' => [
                    'id',
                    'email',
                    'role',
                    'student_profile' => [
                        'id',
                        'user_id',
                        'first_name',
                        'last_name',
                        'phone',
                    ],
                ],
            ])
            ->assertJsonPath('user.student_profile.first_name', 'John')
            ->assertJsonPath('user.student_profile.last_name', 'Doe');
    }

    /**
     * Test authenticated teacher can get their profile.
     */
    public function test_authenticated_teacher_can_get_profile(): void
    {
        $user = User::factory()->create(['role' => 'teacher']);
        TeacherProfile::factory()->create([
            'user_id' => $user->id,
            'first_name' => 'Jane',
            'last_name' => 'Smith',
            'specialization' => 'Mathematics',
        ]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/auth/me');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'user' => [
                    'id',
                    'email',
                    'role',
                    'teacher_profile' => [
                        'id',
                        'user_id',
                        'first_name',
                        'last_name',
                        'phone',
                        'specialization',
                        'bio',
                    ],
                ],
            ])
            ->assertJsonPath('user.teacher_profile.first_name', 'Jane')
            ->assertJsonPath('user.teacher_profile.last_name', 'Smith')
            ->assertJsonPath('user.teacher_profile.specialization', 'Mathematics');
    }

    /**
     * Test authenticated admin can get their profile.
     */
    public function test_authenticated_admin_can_get_profile(): void
    {
        $user = User::factory()->create(['role' => 'admin']);
        TeacherProfile::factory()->create([
            'user_id' => $user->id,
            'first_name' => 'Admin',
            'last_name' => 'User',
        ]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/auth/me');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'user' => [
                    'id',
                    'email',
                    'role',
                    'teacher_profile',
                ],
            ])
            ->assertJsonPath('user.role', 'admin');
    }

    /**
     * Test unauthenticated user cannot access me endpoint.
     */
    public function test_unauthenticated_user_cannot_access_me_endpoint(): void
    {
        $response = $this->getJson('/api/auth/me');

        $response->assertStatus(401);
    }
}
