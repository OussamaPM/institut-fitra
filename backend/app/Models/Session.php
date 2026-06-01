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
        'program_level_id',
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
        'level_number',
    ];

    /**
     * Numéro de niveau de la session (null = niveau 1 / programme de base).
     */
    public function getLevelNumberAttribute(): int
    {
        if (! $this->program_level_id) {
            return 1;
        }

        return (int) ($this->programLevel?->level_number ?? 1);
    }

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

    public function programLevel(): BelongsTo
    {
        return $this->belongsTo(ProgramLevel::class);
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

    /**
     * Sessions visibles par un élève : il doit être inscrit à la classe ET avoir accès
     * au niveau de la session.
     *
     * - Niveau de base (program_level_id = null) : accessible si inscrit à la classe.
     * - Niveau supérieur : accessible uniquement si l'élève a une commande payée/partielle
     *   pour CE niveau dans CETTE classe.
     */
    public function scopeVisibleToStudent($query, int $studentId)
    {
        return $query
            ->whereHas('class.enrollments', function ($q) use ($studentId): void {
                $q->where('student_id', $studentId)->where('status', 'active');
            })
            ->where(function ($q) use ($studentId): void {
                $q->whereNull('class_sessions.program_level_id')
                    ->orWhereExists(function ($sub) use ($studentId): void {
                        $sub->selectRaw('1')
                            ->from('orders')
                            ->whereColumn('orders.program_level_id', 'class_sessions.program_level_id')
                            ->whereColumn('orders.class_id', 'class_sessions.class_id')
                            ->where('orders.student_id', $studentId)
                            ->whereIn('orders.status', ['paid', 'partial']);
                    });
            });
    }
}
