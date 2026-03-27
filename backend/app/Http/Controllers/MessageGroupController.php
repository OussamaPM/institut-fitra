<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\GroupMember;
use App\Models\Message;
use App\Models\MessageGroup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class MessageGroupController extends Controller
{
    /**
     * Get all groups the user is a member of.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $userId = $user->id;

            $groups = $user->messageGroups()
                ->with(['creator', 'program', 'class'])
                ->withCount('users')
                ->get();

            if ($groups->isEmpty()) {
                return response()->json(['groups' => []]);
            }

            $groupIds = $groups->pluck('id');

            // Batch query pour les derniers messages par groupe
            $lastMessageIds = Message::selectRaw('MAX(id) as id')
                ->whereIn('group_id', $groupIds)
                ->groupBy('group_id')
                ->pluck('id');

            $lastMessages = Message::with(['sender.studentProfile', 'sender.teacherProfile'])
                ->whereIn('id', $lastMessageIds)
                ->get()
                ->keyBy('group_id');

            // Batch query pour les compteurs de non-lus par groupe
            $unreadCounts = Message::whereIn('group_id', $groupIds)
                ->where('sender_id', '!=', $userId)
                ->whereNull('read_at')
                ->selectRaw('group_id, COUNT(*) as count')
                ->groupBy('group_id')
                ->pluck('count', 'group_id');

            $result = $groups->map(function ($group) use ($user, $lastMessages, $unreadCounts) {
                return [
                    'id' => $group->id,
                    'name' => $group->name,
                    'type' => $group->type,
                    'program' => $group->program,
                    'class' => $group->class,
                    'creator' => $group->creator,
                    'members_count' => $group->users_count,
                    'last_message' => $lastMessages->get($group->id),
                    'unread_count' => $unreadCounts->get($group->id, 0),
                    'students_can_write' => $group->students_can_write,
                    'can_write' => $group->canUserWrite($user),
                    'created_at' => $group->created_at,
                ];
            })
                ->sortByDesc(fn ($g) => $g['last_message']?->sent_at ?? $g['created_at'])
                ->values();

            return response()->json([
                'groups' => $result,
            ]);
        } catch (\Exception $e) {
            Log::error('Get groups error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la récupération des groupes.',
            ], 500);
        }
    }

    /**
     * Create a new message group.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => ['required', 'string', 'max:255'],
                'type' => ['required', 'in:program,class,custom'],
                'program_id' => ['nullable', 'exists:programs,id'],
                'class_id' => ['nullable', 'exists:classes,id'],
                'member_ids' => ['nullable', 'array'],
                'member_ids.*' => ['exists:users,id'],
                'students_can_write' => ['nullable', 'boolean'],
            ], [
                'name.required' => 'Le nom du groupe est obligatoire.',
                'type.required' => 'Le type de groupe est obligatoire.',
                'type.in' => 'Le type doit être: program, class ou custom.',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'message' => 'Erreurs de validation.',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $user = $request->user();

            // Only teachers and admins can create groups
            if ($user->role === 'student') {
                return response()->json([
                    'message' => 'Seuls les enseignants et administrateurs peuvent créer des groupes.',
                ], 403);
            }

            DB::beginTransaction();

            $group = MessageGroup::create([
                'name' => $request->name,
                'type' => $request->type,
                'program_id' => $request->program_id,
                'class_id' => $request->class_id,
                'created_by' => $user->id,
                'students_can_write' => $request->boolean('students_can_write', false),
            ]);

            // Add creator as member
            GroupMember::create([
                'group_id' => $group->id,
                'user_id' => $user->id,
                'joined_at' => now(),
            ]);

            // Add other members if provided
            if ($request->has('member_ids')) {
                foreach ($request->member_ids as $memberId) {
                    if ((int) $memberId !== $user->id) {
                        GroupMember::create([
                            'group_id' => $group->id,
                            'user_id' => $memberId,
                            'joined_at' => now(),
                        ]);
                    }
                }
            }

            DB::commit();

            $group->load(['creator.teacherProfile', 'users.studentProfile', 'users.teacherProfile', 'program', 'class']);

            return response()->json([
                'message' => 'Groupe créé avec succès.',
                'group' => $group,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Create group error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la création du groupe.',
            ], 500);
        }
    }

    /**
     * Get a specific group with messages.
     */
    public function show(Request $request, MessageGroup $messageGroup): JsonResponse
    {
        try {
            $user = $request->user();

            // Check if user is a member
            if (! $messageGroup->hasMember($user) && $user->role !== 'admin') {
                return response()->json([
                    'message' => 'Vous n\'êtes pas membre de ce groupe.',
                ], 403);
            }

            $messages = $messageGroup->messages()
                ->with(['sender.studentProfile', 'sender.teacherProfile'])
                ->orderBy('sent_at', 'asc')
                ->get();

            // Mark messages as read (except own messages)
            Message::where('group_id', $messageGroup->id)
                ->where('sender_id', '!=', $user->id)
                ->whereNull('read_at')
                ->update(['read_at' => now()]);

            $messageGroup->load(['creator.teacherProfile', 'users.studentProfile', 'users.teacherProfile', 'program', 'class']);

            // Build response with can_write calculated
            $groupData = $messageGroup->toArray();
            $groupData['can_write'] = $messageGroup->canUserWrite($user);
            $groupData['students_can_write'] = $messageGroup->students_can_write;

            return response()->json([
                'group' => $groupData,
                'messages' => $messages,
            ]);
        } catch (\Exception $e) {
            Log::error('Show group error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la récupération du groupe.',
            ], 500);
        }
    }

    /**
     * Send a message to a group.
     */
    public function sendMessage(Request $request, MessageGroup $messageGroup): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'content' => ['nullable', 'string', 'max:5000'],
                'file' => ['nullable', 'file', 'max:10240', 'mimes:jpg,jpeg,png,gif,webp,pdf,mp3,ogg,wav'],
            ], [
                'content.max' => 'Le message ne peut pas dépasser 5000 caractères.',
                'file.max' => 'Le fichier ne peut pas dépasser 10 Mo.',
                'file.mimes' => 'Type de fichier non autorisé. Formats acceptés : images (jpg, png, gif, webp), PDF, audio (mp3, ogg, wav).',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'message' => 'Erreurs de validation.',
                    'errors' => $validator->errors(),
                ], 422);
            }

            if (! $request->filled('content') && ! $request->hasFile('file')) {
                return response()->json([
                    'message' => 'Le message ou un fichier est obligatoire.',
                    'errors' => ['content' => ['Le message ou un fichier est obligatoire.']],
                ], 422);
            }

            $user = $request->user();

            // Check if user is a member
            if (! $messageGroup->hasMember($user)) {
                return response()->json([
                    'message' => 'Vous n\'êtes pas membre de ce groupe.',
                ], 403);
            }

            // Check if user can write in this group
            if (! $messageGroup->canUserWrite($user)) {
                return response()->json([
                    'message' => 'Vous n\'avez pas l\'autorisation d\'écrire dans ce groupe.',
                ], 403);
            }

            $attachmentData = [];
            if ($request->hasFile('file')) {
                $file = $request->file('file');
                $extension = strtolower($file->getClientOriginalExtension());
                $attachmentType = match (true) {
                    in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'webp']) => 'image',
                    $extension === 'pdf' => 'pdf',
                    in_array($extension, ['mp3', 'ogg', 'wav']) => 'audio',
                    default => 'pdf',
                };
                $path = $file->store('message-attachments', 'public');
                $attachmentData = [
                    'attachment_path' => $path,
                    'attachment_type' => $attachmentType,
                    'attachment_original_name' => $file->getClientOriginalName(),
                    'attachment_size' => $file->getSize(),
                ];
            }

            $message = Message::create(array_merge([
                'sender_id' => $user->id,
                'group_id' => $messageGroup->id,
                'content' => $request->input('content', ''),
                'sent_at' => now(),
            ], $attachmentData));

            $message->load(['sender.studentProfile', 'sender.teacherProfile']);

            return response()->json([
                'message' => 'Message envoyé.',
                'data' => $message,
            ], 201);
        } catch (\Exception $e) {
            Log::error('Send group message error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de l\'envoi du message.',
            ], 500);
        }
    }

    /**
     * Add members to a group.
     */
    public function addMembers(Request $request, MessageGroup $messageGroup): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'member_ids' => ['required', 'array'],
                'member_ids.*' => ['exists:users,id'],
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'message' => 'Erreurs de validation.',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $user = $request->user();

            // Only creator or admin can add members
            if ($messageGroup->created_by !== $user->id && $user->role !== 'admin') {
                return response()->json([
                    'message' => 'Seul le créateur du groupe peut ajouter des membres.',
                ], 403);
            }

            $added = 0;
            foreach ($request->member_ids as $memberId) {
                $exists = GroupMember::where('group_id', $messageGroup->id)
                    ->where('user_id', $memberId)
                    ->exists();

                if (! $exists) {
                    GroupMember::create([
                        'group_id' => $messageGroup->id,
                        'user_id' => $memberId,
                        'joined_at' => now(),
                    ]);
                    $added++;
                }
            }

            return response()->json([
                'message' => "{$added} membre(s) ajouté(s) au groupe.",
            ]);
        } catch (\Exception $e) {
            Log::error('Add members error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de l\'ajout des membres.',
            ], 500);
        }
    }

    /**
     * Remove a member from a group.
     */
    public function removeMember(Request $request, MessageGroup $messageGroup, int $userId): JsonResponse
    {
        try {
            $user = $request->user();

            // Only creator or admin can remove members (or user can leave)
            if ($messageGroup->created_by !== $user->id && $user->role !== 'admin' && $user->id !== $userId) {
                return response()->json([
                    'message' => 'Non autorisé.',
                ], 403);
            }

            // Cannot remove the creator
            if ($userId === $messageGroup->created_by) {
                return response()->json([
                    'message' => 'Impossible de retirer le créateur du groupe.',
                ], 422);
            }

            GroupMember::where('group_id', $messageGroup->id)
                ->where('user_id', $userId)
                ->delete();

            return response()->json([
                'message' => 'Membre retiré du groupe.',
            ]);
        } catch (\Exception $e) {
            Log::error('Remove member error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors du retrait du membre.',
            ], 500);
        }
    }

    /**
     * Update group settings.
     */
    public function update(Request $request, MessageGroup $messageGroup): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => ['sometimes', 'string', 'max:255'],
                'students_can_write' => ['sometimes', 'boolean'],
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'message' => 'Erreurs de validation.',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $user = $request->user();

            // Only creator or admin can update
            if ($messageGroup->created_by !== $user->id && $user->role !== 'admin') {
                return response()->json([
                    'message' => 'Non autorisé.',
                ], 403);
            }

            $messageGroup->update($request->only(['name', 'students_can_write']));

            return response()->json([
                'message' => 'Groupe mis à jour avec succès.',
                'group' => $messageGroup->fresh(['creator.teacherProfile', 'users.studentProfile', 'users.teacherProfile', 'program', 'class']),
            ]);
        } catch (\Exception $e) {
            Log::error('Update group error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la mise à jour du groupe.',
            ], 500);
        }
    }

    /**
     * Delete a group.
     */
    public function destroy(Request $request, MessageGroup $messageGroup): JsonResponse
    {
        try {
            $user = $request->user();

            // Only creator or admin can delete
            if ($messageGroup->created_by !== $user->id && $user->role !== 'admin') {
                return response()->json([
                    'message' => 'Non autorisé.',
                ], 403);
            }

            // Delete all messages and members (cascade should handle this)
            $messageGroup->delete();

            return response()->json([
                'message' => 'Groupe supprimé avec succès.',
            ]);
        } catch (\Exception $e) {
            Log::error('Delete group error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la suppression du groupe.',
            ], 500);
        }
    }
}
