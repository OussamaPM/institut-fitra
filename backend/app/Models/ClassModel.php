<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClassModel extends Model
{
    use HasFactory;

    protected $table = 'classes';

    protected $fillable = [
        'program_id',
        'name',
        'academic_year',
        'start_date',
        'end_date',
        'max_students',
        'status',
        'zoom_link',
        'parent_class_id',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'max_students' => 'integer',
    ];

    /**
     * Attributs à ajouter au JSON
     */
    protected $appends = [
        'enrolled_students_count',
        'remaining_capacity',
    ];

    /**
     * Relation : Une classe appartient à un programme
     */
    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }

    /**
     * Relation : Classe parente (niveau précédent)
     */
    public function parentClass(): BelongsTo
    {
        return $this->belongsTo(ClassModel::class, 'parent_class_id');
    }

    /**
     * Relation : Classes enfants (niveaux suivants)
     */
    public function childClasses(): HasMany
    {
        return $this->hasMany(ClassModel::class, 'parent_class_id');
    }

    /**
     * Relation : Une classe a plusieurs inscriptions
     */
    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class, 'class_id');
    }

    /**
     * Relation : Une classe a plusieurs sessions
     */
    public function sessions(): HasMany
    {
        return $this->hasMany(Session::class, 'class_id');
    }

    /**
     * Relation : Une classe a plusieurs élèves (via inscriptions)
     */
    public function students(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'enrollments', 'class_id', 'student_id')
            ->wherePivot('status', 'active')
            ->withPivot('status', 'enrolled_at', 'expires_at')
            ->withTimestamps();
    }

    /**
     * Accessor : Nombre d'élèves inscrits
     */
    public function getEnrolledStudentsCountAttribute(): int
    {
        return $this->enrollments()->where('status', 'active')->count();
    }

    /**
     * Accessor : Capacité restante
     */
    public function getRemainingCapacityAttribute(): ?int
    {
        if ($this->max_students === null) {
            return null; // Illimité
        }

        return max(0, $this->max_students - $this->enrolled_students_count);
    }

    /**
     * Scope : Classes en cours
     */
    public function scopeOngoing($query)
    {
        return $query->where('status', 'ongoing');
    }

    /**
     * Scope : Classes planifiées
     */
    public function scopePlanned($query)
    {
        return $query->where('status', 'planned');
    }

    /**
     * Scope : Classes par année académique
     */
    public function scopeByAcademicYear($query, string $year)
    {
        return $query->where('academic_year', $year);
    }
}
