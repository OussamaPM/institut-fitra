<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    protected $fillable = [
        'key',
        'value',
        'type',
        'group',
        'label',
        'description',
        'is_secret',
    ];

    protected $casts = [
        'is_secret' => 'boolean',
    ];

    /**
     * Récupérer une valeur de paramètre
     */
    public static function getValue(string $key, mixed $default = null): mixed
    {
        $setting = Cache::remember("setting.{$key}", 3600, function () use ($key) {
            return self::where('key', $key)->first();
        });

        if (! $setting) {
            return $default;
        }

        return self::castValue($setting->value, $setting->type);
    }

    /**
     * Définir une valeur de paramètre
     */
    public static function setValue(string $key, mixed $value): bool
    {
        $setting = self::where('key', $key)->first();

        if (! $setting) {
            return false;
        }

        // Convertir les booléens en string
        if ($setting->type === 'boolean') {
            $value = $value ? 'true' : 'false';
        } elseif ($setting->type === 'json') {
            $value = json_encode($value);
        }

        $setting->update(['value' => $value]);

        // Invalider le cache
        Cache::forget("setting.{$key}");

        return true;
    }

    /**
     * Récupérer tous les paramètres d'un groupe
     */
    public static function getByGroup(string $group): array
    {
        return self::where('group', $group)
            ->get()
            ->map(function ($setting) {
                return [
                    'key' => $setting->key,
                    'value' => $setting->is_secret && $setting->value
                        ? self::maskSecret($setting->value)
                        : self::castValue($setting->value, $setting->type),
                    'type' => $setting->type,
                    'label' => $setting->label,
                    'description' => $setting->description,
                    'is_secret' => $setting->is_secret,
                    'is_set' => ! empty($setting->value),
                ];
            })
            ->keyBy('key')
            ->toArray();
    }

    /**
     * Récupérer tous les paramètres groupés
     */
    public static function getAllGrouped(): array
    {
        return [
            'maintenance' => self::getByGroup('maintenance'),
            'stripe' => self::getByGroup('stripe'),
            'zoom' => self::getByGroup('zoom'),
        ];
    }

    /**
     * Caster la valeur selon son type
     */
    protected static function castValue(?string $value, string $type): mixed
    {
        if ($value === null) {
            return null;
        }

        return match ($type) {
            'boolean' => $value === 'true',
            'json' => json_decode($value, true),
            'integer' => (int) $value,
            default => $value,
        };
    }

    /**
     * Masquer une valeur secrète pour l'affichage
     */
    protected static function maskSecret(string $value): string
    {
        if (strlen($value) <= 8) {
            return '••••••••';
        }

        return substr($value, 0, 4).'••••••••'.substr($value, -4);
    }
}
