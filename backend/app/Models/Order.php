<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'program_id',
        'class_id',
        'level_number',
        'program_level_id',
        'customer_email',
        'customer_first_name',
        'customer_last_name',
        'total_amount',
        'installments_count',
        'payment_method',
        'status',
        'stripe_checkout_session_id',
        'stripe_customer_id',
        'stripe_payment_intent_id',
        'stripe_subscription_id',
        'stripe_price_id',
        'admin_notes',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'installments_count' => 'integer',
        'level_number' => 'integer',
    ];

    /**
     * Relation: Commande appartient à un élève (user)
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    /**
     * Relation: Commande pour un programme
     */
    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }

    /**
     * Relation: Commande associée à une classe
     */
    public function class(): BelongsTo
    {
        return $this->belongsTo(ClassModel::class, 'class_id');
    }

    /**
     * Relation: Commande pour un niveau de programme (niveaux 2+)
     */
    public function programLevel(): BelongsTo
    {
        return $this->belongsTo(ProgramLevel::class, 'program_level_id');
    }

    /**
     * Relation: Commande a plusieurs paiements
     */
    public function payments(): HasMany
    {
        return $this->hasMany(OrderPayment::class);
    }

    /**
     * Paiements originaux réussis (excluant les paiements de régularisation)
     */
    public function successfulPayments(): HasMany
    {
        return $this->hasMany(OrderPayment::class)
            ->where('status', 'succeeded')
            ->where('is_recovery_payment', false);
    }

    /**
     * Paiements planifiés
     */
    public function pendingPayments(): HasMany
    {
        return $this->hasMany(OrderPayment::class)
            ->where('status', 'scheduled')
            ->where('is_recovery_payment', false);
    }

    /**
     * Paiements originaux échoués (tous, y compris ceux qui ont été régularisés)
     */
    public function failedPayments(): HasMany
    {
        return $this->hasMany(OrderPayment::class)
            ->where('status', 'failed')
            ->where('is_recovery_payment', false);
    }

    /**
     * Paiements échoués NON régularisés (en attente de régularisation)
     */
    public function unrecoveredFailedPayments(): HasMany
    {
        return $this->hasMany(OrderPayment::class)
            ->where('status', 'failed')
            ->where('is_recovery_payment', false)
            ->whereDoesntHave('recoveryPayment', function ($query) {
                $query->where('status', 'succeeded');
            });
    }

    /**
     * Paiements de régularisation
     */
    public function recoveryPayments(): HasMany
    {
        return $this->hasMany(OrderPayment::class)->where('is_recovery_payment', true);
    }

    /**
     * Montant total payé (incluant régularisations)
     */
    public function getPaidAmountAttribute(): float
    {
        // Paiements originaux réussis + paiements de régularisation réussis
        return (float) $this->payments()
            ->where('status', 'succeeded')
            ->sum('amount');
    }

    /**
     * Montant restant à payer
     */
    public function getRemainingAmountAttribute(): float
    {
        return (float) $this->total_amount - $this->paid_amount;
    }

    /**
     * Nombre de paiements originaux réussis
     */
    public function getSuccessfulPaymentsCountAttribute(): int
    {
        return $this->successfulPayments()->count();
    }

    /**
     * Nombre de paiements en attente
     */
    public function getPendingPaymentsCountAttribute(): int
    {
        return $this->pendingPayments()->count();
    }

    /**
     * Nombre de paiements échoués NON régularisés
     */
    public function getFailedPaymentsCountAttribute(): int
    {
        return $this->unrecoveredFailedPayments()->count();
    }

    /**
     * Nombre de paiements régularisés
     */
    public function getRecoveredPaymentsCountAttribute(): int
    {
        return $this->failedPayments()
            ->whereHas('recoveryPayment', function ($query) {
                $query->where('status', 'succeeded');
            })
            ->count();
    }

    /**
     * Nom complet du client
     */
    public function getCustomerFullNameAttribute(): string
    {
        return $this->customer_first_name.' '.$this->customer_last_name;
    }
}
