<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UserController extends Controller
{
    /**
     * Get all users with pagination.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = User::query();

            // Filter by role
            if ($request->has('role')) {
                $query->where('role', $request->role);
            }

            // Search by name or email
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            }

            $users = $query->with(['studentProfile', 'teacherProfile'])
                ->orderBy('created_at', 'desc')
                ->paginate($request->per_page ?? 15);

            return response()->json($users);
        } catch (\Exception $e) {
            Log::error('Failed to fetch users: '.$e->getMessage());

            return response()->json([
                'message' => 'Impossible de récupérer les utilisateurs.',
            ], 500);
        }
    }

    /**
     * Get a single user by ID.
     */
    public function show(User $user): JsonResponse
    {
        try {
            $user->load(['studentProfile', 'teacherProfile', 'enrollments.class.program']);

            return response()->json(['user' => $user]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch user: '.$e->getMessage());

            return response()->json([
                'message' => 'Impossible de récupérer l\'utilisateur.',
            ], 500);
        }
    }

    /**
     * Create a new user.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'first_name' => ['required', 'string', 'max:255'],
                'last_name' => ['required', 'string', 'max:255'],
                'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
                'password' => ['required', 'string', Password::min(8)],
                'role' => ['required', Rule::in(['student', 'teacher', 'admin'])],

                // Student profile fields
                'gender' => ['required_if:role,student', 'nullable', Rule::in(['male', 'female'])],
                'profile_photo' => ['nullable', 'image', 'max:2048'], // Max 2MB
                'phone' => ['nullable', 'string', 'max:20'],
                'date_of_birth' => ['nullable', 'date', 'before:today'],
                'address' => ['nullable', 'string'],
                'city' => ['nullable', 'string', 'max:255'],
                'country' => ['nullable', 'string', 'max:255'],
                'emergency_contact' => ['nullable', 'string', 'max:255'],

                // Teacher profile fields
                'specialization' => ['required_if:role,teacher,admin', 'nullable', 'string', 'max:255'],
                'bio' => ['nullable', 'string'],
            ]);

            // Create user
            $user = User::create([
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'role' => $validated['role'],
            ]);

            // Create profile based on role
            if ($validated['role'] === 'student') {
                // Handle profile photo upload
                $profilePhotoPath = null;
                if ($request->hasFile('profile_photo')) {
                    $profilePhotoPath = $request->file('profile_photo')->store('profile-photos', 'public');
                }

                $user->studentProfile()->create([
                    'first_name' => $validated['first_name'],
                    'last_name' => $validated['last_name'],
                    'gender' => $validated['gender'],
                    'profile_photo' => $profilePhotoPath,
                    'phone' => $validated['phone'] ?? null,
                    'date_of_birth' => $validated['date_of_birth'] ?? null,
                    'address' => $validated['address'] ?? null,
                    'city' => $validated['city'] ?? null,
                    'country' => $validated['country'] ?? null,
                    'emergency_contact' => $validated['emergency_contact'] ?? null,
                ]);
            }

            if ($validated['role'] === 'teacher' || $validated['role'] === 'admin') {
                // Handle profile photo upload for teacher/admin
                $teacherProfilePhotoPath = null;
                if ($request->hasFile('profile_photo')) {
                    $teacherProfilePhotoPath = $request->file('profile_photo')->store('profile-photos', 'public');
                }

                $user->teacherProfile()->create([
                    'first_name' => $validated['first_name'],
                    'last_name' => $validated['last_name'],
                    'gender' => $validated['gender'] ?? null,
                    'profile_photo' => $teacherProfilePhotoPath,
                    'phone' => $validated['phone'] ?? null,
                    'specialization' => $validated['specialization'] ?? null,
                    'bio' => $validated['bio'] ?? null,
                ]);
            }

            $user->load(['studentProfile', 'teacherProfile']);

            return response()->json([
                'message' => 'Utilisateur créé avec succès.',
                'user' => $user,
            ], 201);
        } catch (\Exception $e) {
            Log::error('Failed to create user: '.$e->getMessage());

            return response()->json([
                'message' => 'Impossible de créer l\'utilisateur.',
            ], 500);
        }
    }

    /**
     * Update an existing user.
     */
    public function update(Request $request, User $user): JsonResponse
    {
        try {
            $validated = $request->validate([
                'first_name' => ['sometimes', 'string', 'max:255'],
                'last_name' => ['sometimes', 'string', 'max:255'],
                'email' => ['sometimes', 'string', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
                'password' => ['sometimes', 'nullable', 'string', Password::min(8)],
                'role' => ['sometimes', Rule::in(['student', 'teacher', 'admin'])],

                // Profile fields
                'gender' => ['sometimes', Rule::in(['male', 'female'])],
                'profile_photo' => ['sometimes', 'nullable', 'image', 'max:2048'], // Max 2MB
                'phone' => ['sometimes', 'nullable', 'string', 'max:20'],
                'date_of_birth' => ['sometimes', 'nullable', 'date', 'before:today'],
                'address' => ['sometimes', 'nullable', 'string'],
                'city' => ['sometimes', 'nullable', 'string', 'max:255'],
                'country' => ['sometimes', 'nullable', 'string', 'max:255'],
                'emergency_contact' => ['sometimes', 'nullable', 'string', 'max:255'],
                'specialization' => ['sometimes', 'nullable', 'string', 'max:255'],
                'bio' => ['sometimes', 'nullable', 'string'],
            ]);

            // Update user
            $userData = [
                'first_name' => $validated['first_name'] ?? $user->first_name,
                'last_name' => $validated['last_name'] ?? $user->last_name,
                'email' => $validated['email'] ?? $user->email,
            ];

            if (isset($validated['password']) && $validated['password']) {
                $userData['password'] = Hash::make($validated['password']);
            }

            if (isset($validated['role'])) {
                $userData['role'] = $validated['role'];
            }

            $user->update($userData);

            // Update profile
            if ($user->role === 'student' && $user->studentProfile) {
                // Handle profile photo upload
                $profilePhotoPath = $user->studentProfile->profile_photo;
                if ($request->hasFile('profile_photo')) {
                    // Delete old photo if exists
                    if ($profilePhotoPath) {
                        Storage::disk('public')->delete($profilePhotoPath);
                    }
                    $profilePhotoPath = $request->file('profile_photo')->store('profile-photos', 'public');
                }

                $user->studentProfile->update([
                    'first_name' => $validated['first_name'] ?? $user->first_name,
                    'last_name' => $validated['last_name'] ?? $user->last_name,
                    'gender' => $validated['gender'] ?? $user->studentProfile->gender,
                    'profile_photo' => $profilePhotoPath,
                    'phone' => $validated['phone'] ?? $user->studentProfile->phone,
                    'date_of_birth' => $validated['date_of_birth'] ?? $user->studentProfile->date_of_birth,
                    'address' => $validated['address'] ?? $user->studentProfile->address,
                    'city' => $validated['city'] ?? $user->studentProfile->city,
                    'country' => $validated['country'] ?? $user->studentProfile->country,
                    'emergency_contact' => $validated['emergency_contact'] ?? $user->studentProfile->emergency_contact,
                ]);
            }

            if ($user->role === 'teacher' || $user->role === 'admin') {
                // Handle profile photo upload for teacher/admin
                $teacherProfilePhotoPath = $user->teacherProfile?->profile_photo;
                if ($request->hasFile('profile_photo')) {
                    if ($teacherProfilePhotoPath) {
                        Storage::disk('public')->delete($teacherProfilePhotoPath);
                    }
                    $teacherProfilePhotoPath = $request->file('profile_photo')->store('profile-photos', 'public');
                }

                $user->teacherProfile()->updateOrCreate(
                    ['user_id' => $user->id],
                    [
                        'first_name' => $validated['first_name'] ?? $user->first_name,
                        'last_name' => $validated['last_name'] ?? $user->last_name,
                        'gender' => $validated['gender'] ?? $user->teacherProfile?->gender,
                        'profile_photo' => $teacherProfilePhotoPath,
                        'phone' => $validated['phone'] ?? $user->teacherProfile?->phone,
                        'specialization' => $validated['specialization'] ?? $user->teacherProfile?->specialization,
                        'bio' => $validated['bio'] ?? $user->teacherProfile?->bio,
                    ]
                );
            }

            $user->load(['studentProfile', 'teacherProfile']);

            return response()->json([
                'message' => 'Utilisateur mis à jour avec succès.',
                'user' => $user,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to update user: '.$e->getMessage());

            return response()->json([
                'message' => 'Impossible de mettre à jour l\'utilisateur.',
            ], 500);
        }
    }

    /**
     * Delete a user.
     */
    public function destroy(User $user): JsonResponse
    {
        try {
            // Don't allow deleting yourself
            if ($user->id === auth()->id()) {
                return response()->json([
                    'message' => 'Vous ne pouvez pas supprimer votre propre compte.',
                ], 403);
            }

            $user->delete();

            return response()->json([
                'message' => 'Utilisateur supprimé avec succès.',
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to delete user: '.$e->getMessage());

            return response()->json([
                'message' => 'Impossible de supprimer l\'utilisateur.',
            ], 500);
        }
    }
}
