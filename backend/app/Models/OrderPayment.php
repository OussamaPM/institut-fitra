<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class OrderPayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'amount',
        'installment_number',
        'status',
        'scheduled_at',
        'paid_at',
        'stripe_payment_intent_id',
        'stripe_charge_id',
        'stripe_invoice_id',
        'attempt_count',
        'next_retry_at',
        'last_attempt_at',
        'error_message',
        'recovery_for_payment_id',
        'is_recovery_payment',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'installment_number' => 'integer',
        'attempt_count' => 'integer',
        'scheduled_at' => 'datetime',
        'paid_at' => 'datetime',
        'next_retry_at' => 'datetime',
        'last_attempt_at' => 'datetime',
        'is_recovery_payment' => 'boolean',
    ];

    /**
     * Relation: Paiement appartient à une commande
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Relation: Paiement échoué d'origine (pour un paiement de régularisation)
     */
    public function failedPaymentOrigin(): BelongsTo
    {
        return $this->belongsTo(OrderPayment::class, 'recovery_for_payment_id');
    }

    /**
     * Relation: Paiement de régularisation (pour un paiement échoué)
     */
    public function recoveryPayment(): HasOne
    {
        return $this->hasOne(OrderPayment::class, 'recovery_for_payment_id');
    }

    /**
     * Est-ce un paiement réussi ?
     */
    public function isSuccessful(): bool
    {
        return $this->status === 'succeeded';
    }

    /**
     * Est-ce un paiement planifié (en attente d'exécution) ?
     */
    public function isPending(): bool
    {
        return $this->status === 'scheduled';
    }

    /**
     * Est-ce un paiement échoué ?
     */
    public function isFailed(): bool
    {
        return $this->status === 'failed';
    }

    /**
     * Ce paiement échoué a-t-il été régularisé ?
     */
    public function isRecovered(): bool
    {
        if (! $this->isFailed()) {
            return false;
        }

        return $this->recoveryPayment()
            ->where('status', 'succeeded')
            ->exists();
    }

    /**
     * Accesseur: a-t-il été régularisé ?
     */
    public function getIsRecoveredAttribute(): bool
    {
        return $this->isRecovered();
    }
}
