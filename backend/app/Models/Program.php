<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Program extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'price',
        'max_installments',
        'default_class_id',
        'active',
        'created_by',
        'teacher_id',
        'schedule',
        'subject',
        'subject_description',
        'enrollment_conditions',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'max_installments' => 'integer',
        'active' => 'boolean',
        'schedule' => 'array',
    ];

    /**
     * Relation: Programme créé par un utilisateur (teacher/admin)
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Relation: Programme enseigné par un professeur
     */
    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    /**
     * Relation: Un programme a plusieurs classes (promotions)
     */
    public function classes(): HasMany
    {
        return $this->hasMany(ClassModel::class);
    }

    /**
     * Relation: Classes actives pour ce programme
     */
    public function activeClasses(): HasMany
    {
        return $this->hasMany(ClassModel::class)->where('status', 'ongoing');
    }

    /**
     * Relation: Un programme a plusieurs groupes de messages
     */
    public function messageGroups(): HasMany
    {
        return $this->hasMany(MessageGroup::class);
    }

    /**
     * Relation: Classe par défaut pour les nouvelles inscriptions
     */
    public function defaultClass(): BelongsTo
    {
        return $this->belongsTo(ClassModel::class, 'default_class_id');
    }

    /**
     * Relation: Un programme a plusieurs niveaux (niveau 2, 3, 4...)
     * Le niveau 1 est le programme lui-même
     */
    public function levels(): HasMany
    {
        return $this->hasMany(ProgramLevel::class)->orderBy('level_number');
    }

    /**
     * Relation: Niveaux actifs du programme
     */
    public function activeLevels(): HasMany
    {
        return $this->hasMany(ProgramLevel::class)
            ->where('is_active', true)
            ->orderBy('level_number');
    }

    /**
     * Accesseur: Nombre total de niveaux (incluant le niveau 1 = programme)
     */
    public function getLevelsCountAttribute(): int
    {
        return $this->levels()->count() + 1; // +1 pour le niveau 1 (programme lui-même)
    }
}
