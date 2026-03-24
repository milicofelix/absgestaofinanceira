<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class AccountFactory extends Factory
{
    protected $model = Account::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => fake()->randomElement([
                'Conta Corrente',
                'Nubank',
                'Inter',
                'Carteira',
            ]),
            'type' => 'bank',
            'initial_balance' => 0,
            'statement_close_day' => null,
            'due_day' => null,
            'statement_close_month' => null,
            'yield_enabled' => false,
            'cdi_percent' => fake()->randomFloat(2, 80, 120),
            'last_yield_date' => null,
            'credit_limit' => null,
        ];
    }

    public function creditCard(): static
    {
        return $this->state(fn () => [
            'type' => 'credit_card',
            'statement_close_day' => 25,
            'due_day' => 5,
            'credit_limit' => 5000,
        ]);
    }
}