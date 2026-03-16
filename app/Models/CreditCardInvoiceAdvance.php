<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CreditCardInvoiceAdvance extends Model
{
    protected $fillable = [
        'user_id',
        'credit_card_account_id',
        'source_account_id',
        'competence_month',
        'amount',
        'date',
        'description',
        'note',
        'bank_transaction_id',
        'card_transaction_id',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'date' => 'date:Y-m-d',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function creditCardAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'credit_card_account_id');
    }

    public function sourceAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'source_account_id');
    }

    public function bankTransaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class, 'bank_transaction_id');
    }

    public function cardTransaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class, 'card_transaction_id');
    }
}