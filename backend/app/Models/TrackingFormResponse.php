<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TrackingFormResponse extends Model
{
    use HasFactory;

    protected $fillable = [
        'assignment_id',
        'question_id',
        'answer',
    ];

    /**
     * L'assignation parente
     */
    public function assignment(): BelongsTo
    {
        return $this->belongsTo(TrackingFormAssignment::class, 'assignment_id');
    }

    /**
     * La question associée
     */
    public function question(): BelongsTo
    {
        return $this->belongsTo(TrackingFormQuestion::class, 'question_id');
    }
}
