<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Installment extends Model
{
  use HasFactory;
  
  protected $fillable = [
    'user_id','account_id','category_id','description','total_amount',
    'installments_count','first_due_date','is_active'
  ];

  protected $casts = [
    'total_amount' => 'decimal:2',
    'installments_count' => 'integer',
    'first_due_date' => 'date',
    'is_active' => 'boolean',
  ];

  public function transactions(): HasMany { return $this->hasMany(Transaction::class); }
  public function account(): BelongsTo { return $this->belongsTo(Account::class); }
  public function category(): BelongsTo { return $this->belongsTo(Category::class); }
}
