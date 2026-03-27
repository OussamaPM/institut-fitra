<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class TrackingForm extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'created_by',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Le créateur du formulaire (admin)
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Les questions du formulaire
     */
    public function questions(): HasMany
    {
        return $this->hasMany(TrackingFormQuestion::class, 'form_id')->orderBy('order');
    }

    /**
     * Les assignations (envois aux élèves)
     */
    public function assignments(): HasMany
    {
        return $this->hasMany(TrackingFormAssignment::class, 'form_id');
    }

    /**
     * Les élèves assignés à ce formulaire
     */
    public function students(): HasManyThrough
    {
        return $this->hasManyThrough(
            User::class,
            TrackingFormAssignment::class,
            'form_id',
            'id',
            'id',
            'student_id'
        );
    }

    /**
     * Nombre d'élèves ayant complété le formulaire
     */
    public function getCompletedCountAttribute(): int
    {
        return $this->assignments()->whereNotNull('completed_at')->count();
    }

    /**
     * Nombre d'élèves n'ayant pas encore complété
     */
    public function getPendingCountAttribute(): int
    {
        return $this->assignments()->whereNull('completed_at')->count();
    }

    /**
     * Nombre total d'élèves assignés
     */
    public function getTotalAssignedAttribute(): int
    {
        return $this->assignments()->count();
    }
}
