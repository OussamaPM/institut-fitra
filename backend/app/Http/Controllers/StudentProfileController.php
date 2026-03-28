<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\ImageOptimizerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class StudentProfileController extends Controller
{
    public function __construct(private ImageOptimizerService $imageOptimizer) {}

    /**
     * Update the authenticated student's profile information.
     */
    public function update(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            if ($user->role !== 'student' || ! $user->studentProfile) {
                return response()->json(['message' => 'Accès refusé.'], 403);
            }

            $validated = $request->validate([
                'email'             => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
                'first_name'        => ['required', 'string', 'max:100'],
                'last_name'         => ['required', 'string', 'max:100'],
                'gender'            => ['nullable', Rule::in(['male', 'female'])],
                'phone'             => ['nullable', 'string', 'max:30'],
                'date_of_birth'     => ['nullable', 'date', 'before:today'],
                'address'           => ['nullable', 'string', 'max:255'],
                'city'              => ['nullable', 'string', 'max:100'],
                'country'           => ['nullable', 'string', 'max:100'],
                'emergency_contact' => ['nullable', 'string', 'max:255'],
            ]);

            $user->update(['email' => $validated['email']]);
            $user->studentProfile->update(collect($validated)->except('email')->toArray());
            $user->load('studentProfile');

            return response()->json([
                'message' => 'Profil mis à jour avec succès.',
                'user'    => $user,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Données invalides.', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('Failed to update student profile: '.$e->getMessage());

            return response()->json(['message' => 'Impossible de mettre à jour le profil.'], 500);
        }
    }

    /**
     * Update the authenticated student's profile photo.
     */
    public function updatePhoto(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            // Verify user is a student with a profile
            if ($user->role !== 'student' || ! $user->studentProfile) {
                return response()->json([
                    'message' => 'Seuls les élèves peuvent modifier leur photo de profil.',
                ], 403);
            }

            $validated = $request->validate([
                'profile_photo' => ['required', 'image', 'max:2048'], // Max 2MB
            ]);

            // Delete old photo if exists
            $this->imageOptimizer->delete($user->studentProfile->profile_photo);

            // Store new photo
            $profilePhotoPath = $this->imageOptimizer->uploadProfilePhoto($request->file('profile_photo'), 'profile-photos');

            // Update profile
            $user->studentProfile->update([
                'profile_photo' => $profilePhotoPath,
            ]);

            // Reload user with profile
            $user->load('studentProfile');

            return response()->json([
                'message' => 'Photo de profil mise à jour avec succès.',
                'user' => $user,
                'profile_photo_url' => $this->imageOptimizer->url($profilePhotoPath),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to update profile photo: '.$e->getMessage());

            return response()->json([
                'message' => 'Impossible de mettre à jour la photo de profil.',
            ], 500);
        }
    }

    /**
     * Remove the authenticated student's profile photo.
     */
    public function removePhoto(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            // Verify user is a student with a profile
            if ($user->role !== 'student' || ! $user->studentProfile) {
                return response()->json([
                    'message' => 'Seuls les élèves peuvent modifier leur photo de profil.',
                ], 403);
            }

            // Delete photo if exists
            if ($user->studentProfile->profile_photo) {
                $this->imageOptimizer->delete($user->studentProfile->profile_photo);

                $user->studentProfile->update([
                    'profile_photo' => null,
                ]);
            }

            // Reload user with profile
            $user->load('studentProfile');

            return response()->json([
                'message' => 'Photo de profil supprimée avec succès.',
                'user' => $user,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to remove profile photo: '.$e->getMessage());

            return response()->json([
                'message' => 'Impossible de supprimer la photo de profil.',
            ], 500);
        }
    }
}
