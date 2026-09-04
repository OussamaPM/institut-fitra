<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DashboardAlertDismissal extends Model
{
    /**
     * Types d'alertes du tableau de bord pouvant être masquées.
     */
    public const TYPES = [
        'failed_payments',
        'sessions_without_replay',
        'unread_messages',
    ];

    /**
     * Modes de retrait : masquée (réaffichable) ou supprimée définitivement.
     */
    public const MODE_HIDDEN = 'hidden';

    public const MODE_DELETED = 'deleted';

    public const MODES = [self::MODE_HIDDEN, self::MODE_DELETED];

    protected $fillable = [
        'user_id',
        'alert_type',
        'mode',
        'dismissed_at',
    ];

    protected $casts = [
        'dismissed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
