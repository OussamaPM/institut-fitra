<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegisterTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_as_student(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'email' => 'student@test.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'student',
            'first_name' => 'Test',
            'last_name' => 'Student',
            'phone' => '0600000000',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'user' => ['id', 'first_name', 'last_name', 'email', 'role'],
                    'token',
                ],
            ])
            ->assertJson([
                'success' => true,
                'data' => [
                    'user' => [
                        'email' => 'student@test.com',
                        'role' => 'student',
                    ],
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'student@test.com',
            'role' => 'student',
        ]);

        $this->assertDatabaseHas('student_profiles', [
            'first_name' => 'Test',
            'last_name' => 'Student',
        ]);
    }

    public function test_user_can_register_as_teacher(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Test Teacher',
            'email' => 'teacher@test.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'teacher',
            'first_name' => 'Test',
            'last_name' => 'Teacher',
            'specialization' => 'Arabic Language',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'user' => [
                        'role' => 'teacher',
                    ],
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'teacher@test.com',
            'role' => 'teacher',
        ]);

        $this->assertDatabaseHas('teacher_profiles', [
            'specialization' => 'Arabic Language',
        ]);
    }

    public function test_registration_fails_with_invalid_email(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Test User',
            'email' => 'invalid-email',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'student',
            'first_name' => 'Test',
            'last_name' => 'User',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_registration_fails_with_short_password(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => '123',
            'password_confirmation' => '123',
            'role' => 'student',
            'first_name' => 'Test',
            'last_name' => 'User',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    public function test_registration_fails_with_password_mismatch(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password123',
            'password_confirmation' => 'different',
            'role' => 'student',
            'first_name' => 'Test',
            'last_name' => 'User',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    public function test_registration_fails_with_duplicate_email(): void
    {
        User::factory()->create([
            'email' => 'existing@test.com',
        ]);

        $response = $this->postJson('/api/auth/register', [
            'name' => 'Test User',
            'email' => 'existing@test.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'student',
            'first_name' => 'Test',
            'last_name' => 'User',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_registration_fails_with_invalid_role(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'invalid_role',
            'first_name' => 'Test',
            'last_name' => 'User',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['role']);
    }

    public function test_registration_fails_when_student_missing_required_fields(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'student',
            // Missing first_name and last_name
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['first_name', 'last_name']);
    }

    public function test_registration_fails_when_teacher_missing_specialization(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'teacher',
            // Missing specialization
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['specialization']);
    }

    public function test_registration_returns_token(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'student',
            'first_name' => 'Test',
            'last_name' => 'User',
        ]);

        $response->assertStatus(201);
        $this->assertNotEmpty($response->json('data.token'));
    }
}
