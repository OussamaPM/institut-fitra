<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Enrollment extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'class_id',
        'status',
        'enrolled_at',
        'expires_at',
        'transferred_to_class_id',
        'transferred_at',
    ];

    protected $casts = [
        'enrolled_at' => 'datetime',
        'expires_at' => 'datetime',
        'transferred_at' => 'datetime',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function class(): BelongsTo
    {
        return $this->belongsTo(ClassModel::class, 'class_id');
    }

    /**
     * Classe d'arrivée quand cette inscription a été clôturée par un changement de classe
     */
    public function transferredToClass(): BelongsTo
    {
        return $this->belongsTo(ClassModel::class, 'transferred_to_class_id');
    }

    /**
     * Accessor pour accéder au programme via la classe
     */
    public function getProgramAttribute()
    {
        return $this->class?->program;
    }
}
