<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    /**
     * Récupérer tous les paramètres (admin only)
     */
    public function index(): JsonResponse
    {
        $settings = Setting::getAllGrouped();

        return response()->json(['settings' => $settings]);
    }

    /**
     * Mettre à jour un ou plusieurs paramètres
     */
    public function update(Request $request): JsonResponse
    {
        $request->validate([
            'settings' => 'required|array',
            'settings.*.key' => 'required|string',
            'settings.*.value' => 'nullable',
        ]);

        $updated = [];
        $errors = [];

        foreach ($request->settings as $item) {
            $key = $item['key'];
            $value = $item['value'];

            // Vérifier que le setting existe
            $setting = Setting::where('key', $key)->first();

            if (! $setting) {
                $errors[] = "Paramètre inconnu : {$key}";

                continue;
            }

            // Ne pas mettre à jour si c'est un secret et que la valeur est masquée
            if ($setting->is_secret && $value && str_contains($value, '••••')) {
                continue;
            }

            Setting::setValue($key, $value);
            $updated[] = $key;
        }

        if (! empty($errors)) {
            return response()->json([
                'message' => 'Certains paramètres n\'ont pas pu être mis à jour',
                'updated' => $updated,
                'errors' => $errors,
            ], 422);
        }

        return response()->json([
            'message' => 'Paramètres mis à jour avec succès',
            'updated' => $updated,
        ]);
    }

    /**
     * Récupérer un paramètre spécifique (public si non secret)
     */
    public function show(string $key): JsonResponse
    {
        $setting = Setting::where('key', $key)->first();

        if (! $setting) {
            return response()->json(['error' => 'Paramètre non trouvé'], 404);
        }

        // Les paramètres secrets ne sont pas accessibles publiquement
        if ($setting->is_secret) {
            return response()->json(['error' => 'Accès non autorisé'], 403);
        }

        $value = match ($setting->type) {
            'boolean' => $setting->value === 'true',
            'json' => json_decode($setting->value, true),
            default => $setting->value,
        };

        return response()->json([
            'key' => $setting->key,
            'value' => $value,
        ]);
    }

    /**
     * Endpoint public pour vérifier le mode coming soon
     */
    public function getComingSoonStatus(): JsonResponse
    {
        $isEnabled = Setting::getValue('coming_soon_enabled', false);

        return response()->json([
            'coming_soon_enabled' => $isEnabled,
        ]);
    }
}
