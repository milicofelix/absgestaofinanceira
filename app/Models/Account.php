<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Account extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 
        'name', 
        'type', 
        'initial_balance', 
        'statement_close_day', 
        'due_day',
        'statement_close_month',
        'yield_enabled',
        'cdi_percent',
        'last_yield_date',
        'credit_limit',
        ];

    protected $casts = [
        'initial_balance' => 'decimal:2',
        'yield_enabled' => 'boolean',
        'cdi_percent' => 'decimal:2',
        'credit_limit' => 'decimal:2',
        'last_yield_date' => 'date',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }
}
