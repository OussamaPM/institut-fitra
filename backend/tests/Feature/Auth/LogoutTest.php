<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LogoutTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test user can logout successfully.
     */
    public function test_user_can_logout_successfully(): void
    {
        $user = User::factory()->create(['role' => 'student']);
        StudentProfile::factory()->create(['user_id' => $user->id]);

        // Authenticate user with Sanctum
        Sanctum::actingAs($user);

        // Attempt logout
        $response = $this->postJson('/api/auth/logout');

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Déconnexion réussie.',
            ]);
    }

    /**
     * Test logout requires authentication.
     */
    public function test_logout_requires_authentication(): void
    {
        $response = $this->postJson('/api/auth/logout');

        $response->assertStatus(401);
    }

    /**
     * Test token is revoked after logout.
     */
    public function test_token_is_revoked_after_logout(): void
    {
        $user = User::factory()->create(['role' => 'student']);
        StudentProfile::factory()->create(['user_id' => $user->id]);

        // Create a token for the user
        $token = $user->createToken('auth_token')->plainTextToken;

        // Verify the user can access protected endpoint
        $response = $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
        ])->getJson('/api/auth/me');

        $response->assertStatus(200);

        // Logout using the token
        $response = $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
        ])->postJson('/api/auth/logout');

        $response->assertStatus(200);

        // Verify the user has no valid tokens after logout
        $this->assertCount(0, $user->fresh()->tokens);
    }
}
