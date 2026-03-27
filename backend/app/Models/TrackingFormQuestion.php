<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TrackingFormQuestion extends Model
{
    use HasFactory;

    protected $fillable = [
        'form_id',
        'question',
        'type',
        'options',
        'order',
        'required',
    ];

    protected $casts = [
        'options' => 'array',
        'required' => 'boolean',
        'order' => 'integer',
    ];

    /**
     * Le formulaire parent
     */
    public function form(): BelongsTo
    {
        return $this->belongsTo(TrackingForm::class, 'form_id');
    }

    /**
     * Les réponses à cette question
     */
    public function responses(): HasMany
    {
        return $this->hasMany(TrackingFormResponse::class, 'question_id');
    }
}
