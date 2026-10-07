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
     * Score sur les QCM uniquement. Le total est le nombre de QCM du quiz :
     * un QCM non répondu (is_correct null) compte comme une erreur, et les
     * réponses libres ne sont jamais notées. Les relations déjà chargées
     * (answers, quiz.questions) sont réutilisées pour éviter des requêtes N+1.
     */
    public function getScoreAttribute(): array
    {
        $answers = $this->relationLoaded('answers') ? $this->answers : $this->answers()->get();
        $correct = $answers->where('is_correct', true)->count();

        $quiz = $this->relationLoaded('quiz') ? $this->quiz : null;
        $total = $quiz !== null && $quiz->relationLoaded('questions')
            ? $quiz->questions->where('type', 'multiple_choice')->count()
            : QuizQuestion::where('quiz_id', $this->quiz_id)->where('type', 'multiple_choice')->count();

        return [
            'correct' => $correct,
            'incorrect' => $total - $correct,
            'total' => $total,
        ];
    }
}
