<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Session extends Model
{
    use HasFactory;

    protected $table = 'class_sessions';

    protected $fillable = [
        'class_id',
        'teacher_id',
        'title',
        'description',
        'scheduled_at',
        'duration_minutes',
        'status',
        'color',
        'replay_url',
        'replay_validity_days',
        'replay_added_at',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
        'duration_minutes' => 'integer',
        'replay_validity_days' => 'integer',
        'replay_added_at' => 'datetime',
    ];

    protected $appends = [
        'replay_valid',
        'replay_expires_at',
    ];

    /**
     * Check if replay is still valid (not expired)
     */
    public function getReplayValidAttribute(): bool
    {
        if (! $this->replay_url || ! $this->replay_added_at || ! $this->replay_validity_days) {
            return false;
        }

        return $this->replay_added_at->addDays($this->replay_validity_days)->isFuture();
    }

    /**
     * Get replay expiration date
     */
    public function getReplayExpiresAtAttribute(): ?\Carbon\Carbon
    {
        if (! $this->replay_added_at || ! $this->replay_validity_days) {
            return null;
        }

        return $this->replay_added_at->addDays($this->replay_validity_days);
    }

    public function class(): BelongsTo
    {
        return $this->belongsTo(ClassModel::class, 'class_id');
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    /**
     * Accessor pour accéder au programme via la classe
     */
    public function getProgramAttribute()
    {
        return $this->class?->program;
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    public function materials(): HasMany
    {
        return $this->hasMany(SessionMaterial::class);
    }

    public function summary(): HasOne
    {
        return $this->hasOne(SessionSummary::class);
    }
}
