<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RecurringTransaction extends Model
{
  protected $fillable = [
    'user_id','account_id','category_id','type','description','amount',
    'frequency','interval','start_date','end_date','next_run_date',
    'auto_post','is_active',
  ];

  protected $casts = [
    'amount' => 'decimal:2',
    'start_date' => 'date',
    'end_date' => 'date',
    'next_run_date' => 'date',
    'auto_post' => 'boolean',
    'is_active' => 'boolean',
    'interval' => 'integer',
  ];

  public function user(): BelongsTo { return $this->belongsTo(User::class); }
  public function account(): BelongsTo { return $this->belongsTo(Account::class); }
  public function category(): BelongsTo { return $this->belongsTo(Category::class); }
  public function transactions(): HasMany { return $this->hasMany(Transaction::class, 'recurring_id'); }
}

