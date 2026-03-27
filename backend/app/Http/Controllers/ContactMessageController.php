<?php

namespace App\Http\Controllers;

use App\Models\ContactMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class ContactMessageController extends Controller
{
    /**
     * Store a new contact message (Public).
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => ['required', 'string', 'max:255'],
                'email' => ['required', 'email', 'max:255'],
                'phone' => ['nullable', 'string', 'max:20'],
                'subject' => ['required', 'string', 'max:255'],
                'message' => ['required', 'string', 'max:2000'],
            ], [
                'name.required' => 'Le nom est obligatoire.',
                'email.required' => 'L\'email est obligatoire.',
                'email.email' => 'L\'email doit être valide.',
                'subject.required' => 'Le sujet est obligatoire.',
                'message.required' => 'Le message est obligatoire.',
                'message.max' => 'Le message ne peut pas dépasser 2000 caractères.',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'message' => 'Erreurs de validation.',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $contactMessage = ContactMessage::create($validator->validated());

            return response()->json([
                'message' => 'Votre message a été envoyé avec succès. Nous vous répondrons dans les plus brefs délais.',
                'contact_message' => $contactMessage,
            ], 201);
        } catch (\Exception $e) {
            Log::error('Contact message store error: '.$e->getMessage());

            return response()->json([
                'message' => 'Une erreur est survenue lors de l\'envoi du message.',
            ], 500);
        }
    }

    /**
     * Get all contact messages (Admin only).
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = ContactMessage::query();

            // Filtre par statut
            if ($request->has('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            // Filtre par messages non lus
            if ($request->has('unread') && $request->unread === 'true') {
                $query->unread();
            }

            // Recherche
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('subject', 'like', "%{$search}%")
                        ->orWhere('message', 'like', "%{$search}%");
                });
            }

            $messages = $query->latest()->get();

            return response()->json([
                'contact_messages' => $messages,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Contact messages index error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la récupération des messages.',
            ], 500);
        }
    }

    /**
     * Show a specific contact message (Admin only).
     */
    public function show(ContactMessage $contactMessage): JsonResponse
    {
        try {
            // Marquer comme lu automatiquement
            if (! $contactMessage->read_at) {
                $contactMessage->markAsRead();
            }

            return response()->json([
                'contact_message' => $contactMessage,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Contact message show error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la récupération du message.',
            ], 500);
        }
    }

    /**
     * Update contact message status (Admin only).
     */
    public function update(Request $request, ContactMessage $contactMessage): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'status' => ['required', 'in:new,in_progress,resolved'],
            ], [
                'status.required' => 'Le statut est obligatoire.',
                'status.in' => 'Le statut doit être: nouveau, en cours ou résolu.',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'message' => 'Erreurs de validation.',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $contactMessage->update($validator->validated());

            return response()->json([
                'message' => 'Statut mis à jour avec succès.',
                'contact_message' => $contactMessage,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Contact message update error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la mise à jour du statut.',
            ], 500);
        }
    }

    /**
     * Delete a contact message (Admin only).
     */
    public function destroy(ContactMessage $contactMessage): JsonResponse
    {
        try {
            $contactMessage->delete();

            return response()->json([
                'message' => 'Message supprimé avec succès.',
            ], 200);
        } catch (\Exception $e) {
            Log::error('Contact message delete error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la suppression du message.',
            ], 500);
        }
    }
}
