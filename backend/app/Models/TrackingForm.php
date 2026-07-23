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
        'is_default',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_default' => 'boolean',
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

    /**
     * Assigne automatiquement les formulaires par défaut (ex: "Formulaire d'inscription")
     * à un nouvel élève. Appelée à la création de tout utilisateur ayant le rôle student,
     * quel que soit le point d'entrée (inscription, paiement Stripe, commande manuelle,
     * création admin, gratuit...).
     */
    public static function assignDefaultsToStudent(User $student): void
    {
        if ($student->role !== 'student') {
            return;
        }

        $defaultForms = static::where('is_default', true)
            ->where('is_active', true)
            ->get();

        foreach ($defaultForms as $form) {
            $alreadyAssigned = TrackingFormAssignment::where('form_id', $form->id)
                ->where('student_id', $student->id)
                ->exists();

            if ($alreadyAssigned) {
                continue;
            }

            TrackingFormAssignment::create([
                'form_id' => $form->id,
                'student_id' => $student->id,
            ]);

            Notification::create([
                'user_id' => $student->id,
                'type' => 'tracking',
                'category' => 'tracking_form_assigned',
                'title' => 'Nouveau formulaire de suivi',
                'message' => "Un formulaire de suivi vous a été envoyé : \"{$form->title}\". Veuillez le compléter dès que possible.",
                'action_url' => '/student/tracking',
            ]);
        }
    }
}
