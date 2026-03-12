<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Category extends Model
{
    protected $fillable = ['user_id', 'name', 'type', 'color'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class, 'category_id');
    }

    public function monthlyBudgets(): HasMany
    {
        return $this->hasMany(CategoryBudget::class, 'category_id');
    }

    public function defaultBudget(): HasOne
    {
        return $this->hasOne(CategoryBudgetDefault::class, 'category_id');
    }
}
