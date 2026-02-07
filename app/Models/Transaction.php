<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Transaction extends Model
{
    protected $fillable = [
        'user_id',
        'transfer_group_id',
        'conterpart_id',
        'type',
        'amount',
        'date',
        'note',
        'description',
        'category_id',
        'account_id',
        'payment_method',
        'is_transfer',
        'transfer_id',
        'transfer_type',
        'transfer_date',
        'transfer_amount',
        'transfer_description',
        'transfer_note',
        'competence_month',
        'competence_year',
        'competence_id',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'date' => 'date:Y-m-d',
        'is_transfer' => 'boolean',
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
}
