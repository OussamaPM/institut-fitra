<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TrackingFormAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'form_id',
        'student_id',
        'sent_at',
        'completed_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    /**
     * Le formulaire assigné
     */
    public function form(): BelongsTo
    {
        return $this->belongsTo(TrackingForm::class, 'form_id');
    }

    /**
     * L'élève assigné
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    /**
     * Les réponses de cet assignation
     */
    public function responses(): HasMany
    {
        return $this->hasMany(TrackingFormResponse::class, 'assignment_id');
    }

    /**
     * Vérifie si le formulaire est complété
     */
    public function getIsCompletedAttribute(): bool
    {
        return $this->completed_at !== null;
    }
}
