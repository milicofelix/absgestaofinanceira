<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Transaction extends Model
{

    protected $fillable = [
        'recurring_id',
        'installment_id',
        'installment_number',
        'transfer_group_id',
        'user_id',
        'type',
        'amount',
        'date',
        'purchase_date',
        'description',
        'note',
        'category_id',
        'account_id',
        'paid_bank_account_id',
        'counterparty_user_id',
        'payment_method',
        'is_cleared',
        'cleared_at',
        'is_transfer',
        'competence_month',
        'idempotency_key',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'date' => 'date:Y-m-d',
        'purchase_date' => 'date',
        'is_transfer' => 'boolean',
        'is_cleared' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }
    
    public function installment(): BelongsTo
    {
        return $this->belongsTo(Installment::class);
    }
}
