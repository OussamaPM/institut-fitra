<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class MeController extends Controller
{
    /**
     * Get authenticated user profile.
     */
    public function show(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            // Load the appropriate profile based on role
            $user->load($user->role === 'student' ? 'studentProfile' : 'teacherProfile');

            return response()->json([
                'user' => $user,
            ], 200);

        } catch (\Exception $e) {
            Log::error('Me endpoint error: '.$e->getMessage());

            return response()->json([
                'message' => 'Une erreur est survenue lors de la récupération du profil.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
