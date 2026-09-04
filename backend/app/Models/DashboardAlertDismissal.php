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

    protected $fillable = [
        'user_id',
        'alert_type',
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
