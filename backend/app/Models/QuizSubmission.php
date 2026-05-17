<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class QuizSubmission extends Model
{
    use HasFactory;

    protected $fillable = [
        'quiz_id',
        'student_id',
        'submitted_at',
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
    ];

    public function quiz(): BelongsTo
    {
        return $this->belongsTo(Quiz::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function answers(): HasMany
    {
        return $this->hasMany(QuizAnswer::class, 'submission_id');
    }

    /**
     * Score : nombre de bonnes/mauvaises réponses sur les QCM uniquement
     */
    public function getScoreAttribute(): array
    {
        $total = $this->answers()->whereNotNull('is_correct')->count();
        $correct = $this->answers()->where('is_correct', true)->count();

        return [
            'correct' => $correct,
            'incorrect' => $total - $correct,
            'total' => $total,
        ];
    }
}
