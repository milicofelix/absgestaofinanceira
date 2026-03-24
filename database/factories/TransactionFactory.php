<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\Category;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class TransactionFactory extends Factory
{
    protected $model = Transaction::class;

    public function definition(): array
    {
        $date = fake()->dateTimeBetween('-2 months', 'now')->format('Y-m-d');

        return [
            'user_id' => User::factory(),
            'type' => 'expense',
            'amount' => fake()->randomFloat(2, 10, 1000),
            'date' => $date,
            'purchase_date' => $date,
            'description' => fake()->sentence(3),
            'note' => null,
            'category_id' => Category::factory(),
            'account_id' => Account::factory(),
            'paid_bank_account_id' => null,
            'payment_method' => 'pix',
            'is_cleared' => false,
            'cleared_at' => null,
            'is_transfer' => false,
            'competence_month' => substr($date, 0, 7),
            'idempotency_key' => (string) Str::uuid(),
            'recurring_id' => null,
            'installment_id' => null,
            'installment_number' => null,
            'transfer_group_id' => null,
            'counterparty_user_id' => null,
        ];
    }
}