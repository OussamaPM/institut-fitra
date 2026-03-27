<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProgramLevel extends Model
{
    use HasFactory;

    protected $fillable = [
        'program_id',
        'level_number',
        'name',
        'description',
        'price',
        'max_installments',
        'schedule',
        'teacher_id',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'max_installments' => 'integer',
        'level_number' => 'integer',
        'schedule' => 'array',
    ];

    // Relations

    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function activations(): HasMany
    {
        return $this->hasMany(ProgramLevelActivation::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class, 'program_level_id');
    }

    // Scopes

    public function scopeActive($query)
    {
        return $query->whereHas('activations');
    }

    public function scopeForProgram($query, int $programId)
    {
        return $query->where('program_id', $programId);
    }

    // Accesseurs

    /**
     * Un niveau est actif s'il a au moins une activation
     */
    public function getIsActiveAttribute(): bool
    {
        if ($this->relationLoaded('activations')) {
            return $this->activations->isNotEmpty();
        }

        return $this->activations()->exists();
    }

    /**
     * Vérifie si des élèves sont inscrits à ce niveau (commandes payées)
     */
    public function getHasEnrollmentsAttribute(): bool
    {
        return $this->orders()
            ->whereIn('status', ['paid', 'partial'])
            ->exists();
    }

    /**
     * Compte le nombre d'élèves inscrits à ce niveau
     */
    public function getEnrollmentsCountAttribute(): int
    {
        return $this->orders()
            ->whereIn('status', ['paid', 'partial'])
            ->count();
    }

    // Méthodes utilitaires

    /**
     * Vérifie si le niveau peut être supprimé
     */
    public function canBeDeleted(): bool
    {
        return ! $this->has_enrollments;
    }

    /**
     * Vérifie si le prix peut être modifié
     */
    public function canModifyPrice(): bool
    {
        return ! $this->has_enrollments;
    }
}
