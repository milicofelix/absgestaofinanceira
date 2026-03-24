<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\Category;
use App\Models\Installment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class InstallmentFactory extends Factory
{
    protected $model = Installment::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'account_id' => Account::factory()->creditCard(),
            'category_id' => Category::factory()->expense(),
            'description' => fake()->randomElement([
                'Compra parcelada',
                'Curso parcelado',
                'Celular parcelado',
                'Mercado parcelado',
            ]),
            'total_amount' => fake()->randomFloat(2, 100, 5000),
            'installments_count' => fake()->numberBetween(2, 12),
            'first_due_date' => fake()->dateTimeBetween('now', '+2 months')->format('Y-m-d'),
            'is_active' => true,
        ];
    }
}