<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\User;
use App\Services\ImageOptimizerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class MessageController extends Controller
{
    public function __construct(private ImageOptimizerService $imageOptimizer) {}

    /**
     * Get conversations list for the authenticated user.
     * Returns a list of users with whom the user has exchanged messages.
     * Students can only see conversations initiated by admins.
     * Optimized to avoid N+1 queries.
     */
    public function conversations(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $userId = $user->id;

            // Students can only see conversations with admins who messaged them first
            if ($user->role === 'student') {
                // Get admin IDs who have sent messages to this student
                $adminIds = Message::where('receiver_id', $userId)
                    ->whereNotNull('sender_id')
                    ->whereHas('sender', function ($query) {
                        $query->where('role', 'admin');
                    })
                    ->pluck('sender_id')
                    ->unique();

                $userIds = $adminIds;
            } else {
                // Get all unique users the current user has exchanged messages with
                $sentToIds = Message::where('sender_id', $userId)
                    ->whereNotNull('receiver_id')
                    ->pluck('receiver_id');

                $receivedFromIds = Message::where('receiver_id', $userId)
                    ->whereNotNull('sender_id')
                    ->pluck('sender_id');

                $userIds = $sentToIds->merge($receivedFromIds)->unique();
            }

            if ($userIds->isEmpty()) {
                return response()->json(['conversations' => []]);
            }

            // Récupérer le dernier message pour chaque conversation en une seule requête
            // Utilise une sous-requête pour trouver l'ID du dernier message par utilisateur
            $lastMessageIds = Message::selectRaw('MAX(id) as id')
                ->where(function ($query) use ($userId) {
                    $query->where('sender_id', $userId)
                        ->orWhere('receiver_id', $userId);
                })
                ->whereNull('group_id')
                ->groupByRaw('CASE
                    WHEN sender_id = ? THEN receiver_id
                    ELSE sender_id
                END', [$userId])
                ->pluck('id');

            // Charger les derniers messages
            $lastMessages = Message::whereIn('id', $lastMessageIds)
                ->get()
                ->keyBy(function ($message) use ($userId) {
                    return $message->sender_id === $userId ? $message->receiver_id : $message->sender_id;
                });

            // Compter les messages non lus par expéditeur en une seule requête
            $unreadCounts = Message::where('receiver_id', $userId)
                ->whereIn('sender_id', $userIds)
                ->whereNull('read_at')
                ->selectRaw('sender_id, COUNT(*) as count')
                ->groupBy('sender_id')
                ->pluck('count', 'sender_id');

            // Charger les utilisateurs avec leurs profils
            $users = User::whereIn('id', $userIds)
                ->with(['studentProfile', 'teacherProfile'])
                ->get();

            // Assembler les conversations
            $conversations = $users->map(function ($otherUser) use ($lastMessages, $unreadCounts) {
                return [
                    'user' => $otherUser,
                    'last_message' => $lastMessages->get($otherUser->id),
                    'unread_count' => $unreadCounts->get($otherUser->id, 0),
                ];
            })
                ->sortByDesc(fn ($conv) => $conv['last_message']?->sent_at)
                ->values();

            return response()->json([
                'conversations' => $conversations,
            ]);
        } catch (\Exception $e) {
            Log::error('Get conversations error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la récupération des conversations.',
            ], 500);
        }
    }

    /**
     * Get messages between authenticated user and another user.
     * Students can only access conversations with admins who contacted them first.
     */
    public function show(Request $request, User $user): JsonResponse
    {
        try {
            $currentUser = $request->user();

            // Students can only access conversations with admins who messaged them first
            if ($currentUser->role === 'student') {
                // Check if the other user is an admin who has sent at least one message to this student
                $adminInitiated = $user->role === 'admin' && Message::where('sender_id', $user->id)
                    ->where('receiver_id', $currentUser->id)
                    ->exists();

                if (! $adminInitiated) {
                    return response()->json([
                        'message' => 'Les étudiants ne peuvent voir que les conversations initiées par un administrateur.',
                    ], 403);
                }
            }

            $messages = Message::where(function ($query) use ($currentUser, $user) {
                $query->where('sender_id', $currentUser->id)
                    ->where('receiver_id', $user->id);
            })->orWhere(function ($query) use ($currentUser, $user) {
                $query->where('sender_id', $user->id)
                    ->where('receiver_id', $currentUser->id);
            })
                ->with(['sender.studentProfile', 'sender.teacherProfile', 'receiver.studentProfile', 'receiver.teacherProfile'])
                ->orderBy('sent_at', 'asc')
                ->get();

            // Mark received messages as read
            Message::where('sender_id', $user->id)
                ->where('receiver_id', $currentUser->id)
                ->unread()
                ->update(['read_at' => now()]);

            return response()->json([
                'messages' => $messages,
                'other_user' => $user->load(['studentProfile', 'teacherProfile']),
            ]);
        } catch (\Exception $e) {
            Log::error('Get messages error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la récupération des messages.',
            ], 500);
        }
    }

    /**
     * Send a message to another user.
     * Students can only reply to admins who contacted them first.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $currentUser = $request->user();

            // Students can only reply to admins who messaged them first
            if ($currentUser->role === 'student') {
                $receiverId = (int) $request->receiver_id;
                $receiver = User::find($receiverId);

                // Check if receiver is an admin who has sent at least one message to this student
                $adminInitiated = $receiver &&
                    $receiver->role === 'admin' &&
                    Message::where('sender_id', $receiverId)
                        ->where('receiver_id', $currentUser->id)
                        ->exists();

                if (! $adminInitiated) {
                    return response()->json([
                        'message' => 'Les étudiants ne peuvent répondre qu\'aux administrateurs qui les ont contactés.',
                    ], 403);
                }
            }

            $validator = Validator::make($request->all(), [
                'receiver_id' => ['required', 'exists:users,id'],
                'content' => ['nullable', 'string', 'max:5000'],
                'file' => ['nullable', 'file', 'max:10240', 'mimes:jpg,jpeg,png,gif,webp,pdf,mp3,ogg,wav'],
            ], [
                'receiver_id.required' => 'Le destinataire est obligatoire.',
                'receiver_id.exists' => 'Le destinataire n\'existe pas.',
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

            // At least content or a file must be provided
            if (! $request->filled('content') && ! $request->hasFile('file')) {
                return response()->json([
                    'message' => 'Le message ou un fichier est obligatoire.',
                    'errors' => ['content' => ['Le message ou un fichier est obligatoire.']],
                ], 422);
            }

            // Prevent sending message to self
            if ((int) $request->receiver_id === $currentUser->id) {
                return response()->json([
                    'message' => 'Vous ne pouvez pas vous envoyer un message à vous-même.',
                ], 422);
            }

            $attachmentData = [];
            if ($request->hasFile('file')) {
                $file = $request->file('file');
                $extension = strtolower($file->getClientOriginalExtension());
                $isImage = in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'webp']);
                $attachmentType = match (true) {
                    $isImage => 'image',
                    $extension === 'pdf' => 'pdf',
                    in_array($extension, ['mp3', 'ogg', 'wav']) => 'audio',
                    default => 'pdf',
                };
                $path = $isImage
                    ? $this->imageOptimizer->uploadMessageImage($file, 'message-attachments')
                    : $this->imageOptimizer->uploadFile($file, 'message-attachments');
                $attachmentData = [
                    'attachment_path' => $path,
                    'attachment_type' => $attachmentType,
                    'attachment_original_name' => $file->getClientOriginalName(),
                    'attachment_size' => $file->getSize(),
                ];
            }

            $message = Message::create(array_merge([
                'sender_id' => $currentUser->id,
                'receiver_id' => $request->receiver_id,
                'content' => $request->input('content', ''),
                'sent_at' => now(),
            ], $attachmentData));

            $message->load(['sender.studentProfile', 'sender.teacherProfile', 'receiver.studentProfile', 'receiver.teacherProfile']);

            return response()->json([
                'message' => 'Message envoyé avec succès.',
                'data' => $message,
            ], 201);
        } catch (\Exception $e) {
            Log::error('Send message error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de l\'envoi du message.',
            ], 500);
        }
    }

    /**
     * Get unread messages count (direct messages + group messages).
     */
    public function unreadCount(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            // Count unread direct messages
            $directCount = Message::where('receiver_id', $user->id)
                ->unread()
                ->count();

            // Count unread group messages
            $groupIds = $user->messageGroups()->pluck('message_groups.id');
            $groupCount = Message::whereIn('group_id', $groupIds)
                ->where('sender_id', '!=', $user->id)
                ->unread()
                ->count();

            return response()->json([
                'unread_count' => $directCount + $groupCount,
            ]);
        } catch (\Exception $e) {
            Log::error('Unread count error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la récupération du nombre de messages non lus.',
            ], 500);
        }
    }

    /**
     * Mark all messages from a user as read.
     */
    public function markAsRead(Request $request, User $user): JsonResponse
    {
        try {
            $currentUser = $request->user();

            Message::where('sender_id', $user->id)
                ->where('receiver_id', $currentUser->id)
                ->unread()
                ->update(['read_at' => now()]);

            return response()->json([
                'message' => 'Messages marqués comme lus.',
            ]);
        } catch (\Exception $e) {
            Log::error('Mark as read error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors du marquage des messages comme lus.',
            ], 500);
        }
    }

    /**
     * Download or stream the attachment of a message (redirects to CDN URL).
     * Only the sender and receiver (or group members) can access it.
     */
    public function downloadAttachment(Request $request, Message $message): RedirectResponse|JsonResponse
    {
        try {
            $currentUser = $request->user();

            // Authorization: sender, receiver, or group member
            $isAuthorized = false;
            if ($message->group_id) {
                $isAuthorized = $message->group?->hasMember($currentUser) || $currentUser->role === 'admin';
            } else {
                $isAuthorized = $message->sender_id === $currentUser->id
                    || $message->receiver_id === $currentUser->id
                    || $currentUser->role === 'admin';
            }

            if (! $isAuthorized) {
                return response()->json(['message' => 'Non autorisé.'], 403);
            }

            if (! $message->attachment_path) {
                return response()->json(['message' => 'Ce message n\'a pas de pièce jointe.'], 404);
            }

            if (! Storage::disk('spaces')->exists($message->attachment_path)) {
                return response()->json(['message' => 'Fichier introuvable.'], 404);
            }

            return redirect($this->imageOptimizer->url($message->attachment_path));
        } catch (\Exception $e) {
            Log::error('Download attachment error: '.$e->getMessage());

            return response()->json(['message' => 'Erreur lors du téléchargement.'], 500);
        }
    }

    /**
     * Get list of users available for messaging.
     * Students cannot access this - they only have groups.
     * Supports search and pagination for better performance.
     */
    public function availableUsers(Request $request): JsonResponse
    {
        try {
            $currentUser = $request->user();

            // Students cannot access direct messages
            if ($currentUser->role === 'student') {
                return response()->json([
                    'users' => [],
                ]);
            }

            $query = User::where('id', '!=', $currentUser->id)
                ->with(['studentProfile', 'teacherProfile']);

            // Filtre par recherche
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            }

            // Filtre par rôle
            if ($request->has('role') && $request->role) {
                $query->where('role', $request->role);
            }

            $users = $query->orderBy('role')
                ->orderBy('first_name')
                ->limit(100) // Limiter à 100 utilisateurs max
                ->get();

            return response()->json([
                'users' => $users,
            ]);
        } catch (\Exception $e) {
            Log::error('Available users error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la récupération des utilisateurs.',
            ], 500);
        }
    }
}
