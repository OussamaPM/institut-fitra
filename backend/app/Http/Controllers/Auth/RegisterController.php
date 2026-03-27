<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class RegisterController extends Controller
{
    /**
     * Register a new user.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        try {
            // DEBUG: Log des données reçues
            Log::info('Register attempt', $request->all());

            // Create user
            $user = User::create([
                'first_name' => $request->validated('first_name'),
                'last_name' => $request->validated('last_name'),
                'email' => $request->validated('email'),
                'password' => $request->validated('password'),
                'role' => $request->validated('role'),
            ]);

            // Create profile based on role
            $this->createUserProfile($user, $request);

            // Create API token
            $token = $user->createToken('auth-token')->plainTextToken;

            return response()->json([
                'success' => true,
                'message' => 'Inscription réussie.',
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'first_name' => $user->first_name,
                        'last_name' => $user->last_name,
                        'email' => $user->email,
                        'role' => $user->role,
                    ],
                    'token' => $token,
                ],
            ], 201);

        } catch (\Exception $e) {
            Log::error('Registration failed: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue lors de l\'inscription.',
            ], 500);
        }
    }

    /**
     * Create user profile based on role.
     */
    private function createUserProfile(User $user, RegisterRequest $request): void
    {
        $role = $request->validated('role');

        if ($role === 'student') {
            $user->studentProfile()->create([
                'first_name' => $request->validated('first_name'),
                'last_name' => $request->validated('last_name'),
                'phone' => $request->validated('phone'),
                'date_of_birth' => $request->validated('date_of_birth'),
                'address' => $request->validated('address'),
                'city' => $request->validated('city'),
                'country' => $request->validated('country'),
                'emergency_contact' => $request->validated('emergency_contact'),
            ]);
        }

        if ($role === 'teacher' || $role === 'admin') {
            $user->teacherProfile()->create([
                'first_name' => $request->validated('first_name'),
                'last_name' => $request->validated('last_name'),
                'phone' => $request->validated('phone'),
                'specialization' => $request->validated('specialization'),
                'bio' => $request->validated('bio'),
            ]);
        }
    }
}
