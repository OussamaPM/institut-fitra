<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Liste des notifications de l'utilisateur connecté
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Notification::where('user_id', $user->id)
            ->orderBy('created_at', 'desc');

        // Filtrer par type si spécifié
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        // Filtrer par statut lu/non lu
        if ($request->has('unread') && $request->unread === 'true') {
            $query->whereNull('read_at');
        }

        $notifications = $query->paginate($request->get('per_page', 20));

        return response()->json([
            'notifications' => $notifications,
        ]);
    }

    /**
     * Nombre de notifications non lues
     */
    public function unreadCount(Request $request): JsonResponse
    {
        $user = $request->user();

        $count = Notification::where('user_id', $user->id)
            ->whereNull('read_at')
            ->count();

        // Compter par type
        $countByType = Notification::where('user_id', $user->id)
            ->whereNull('read_at')
            ->selectRaw('type, COUNT(*) as count')
            ->groupBy('type')
            ->pluck('count', 'type');

        return response()->json([
            'unread_count' => $count,
            'by_type' => $countByType,
        ]);
    }

    /**
     * Marquer une notification comme lue
     */
    public function markAsRead(Request $request, Notification $notification): JsonResponse
    {
        $user = $request->user();

        // Vérifier que la notification appartient à l'utilisateur
        if ($notification->user_id !== $user->id) {
            return response()->json([
                'message' => 'Notification non trouvée',
            ], 404);
        }

        $notification->markAsRead();

        return response()->json([
            'message' => 'Notification marquée comme lue',
            'notification' => $notification,
        ]);
    }

    /**
     * Marquer toutes les notifications comme lues
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $user = $request->user();

        $updated = Notification::where('user_id', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json([
            'message' => "{$updated} notification(s) marquée(s) comme lue(s)",
            'updated_count' => $updated,
        ]);
    }

    /**
     * Marquer les notifications d'un type comme lues
     */
    public function markTypeAsRead(Request $request, string $type): JsonResponse
    {
        $user = $request->user();

        $updated = Notification::where('user_id', $user->id)
            ->where('type', $type)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json([
            'message' => "{$updated} notification(s) de type '{$type}' marquée(s) comme lue(s)",
            'updated_count' => $updated,
        ]);
    }

    /**
     * Supprimer une notification
     */
    public function destroy(Request $request, Notification $notification): JsonResponse
    {
        $user = $request->user();

        // Vérifier que la notification appartient à l'utilisateur
        if ($notification->user_id !== $user->id) {
            return response()->json([
                'message' => 'Notification non trouvée',
            ], 404);
        }

        $notification->delete();

        return response()->json([
            'message' => 'Notification supprimée',
        ]);
    }

    /**
     * Supprimer toutes les notifications lues
     */
    public function destroyRead(Request $request): JsonResponse
    {
        $user = $request->user();

        $deleted = Notification::where('user_id', $user->id)
            ->whereNotNull('read_at')
            ->delete();

        return response()->json([
            'message' => "{$deleted} notification(s) supprimée(s)",
            'deleted_count' => $deleted,
        ]);
    }
}
