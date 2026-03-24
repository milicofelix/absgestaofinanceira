<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class CategoryFactory extends Factory
{
    protected $model = Category::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => fake()->unique()->randomElement([
                'Alimentação',
                'Transporte',
                'Salário',
                'Casa',
                'Lazer',
                'Educação',
                'Mercado',
                'Farmácia',
            ]),
            'type' => 'expense',
            'color' => '#6366F1',
        ];
    }

    public function expense(): static
    {
        return $this->state(fn () => [
            'type' => 'expense',
        ]);
    }

    public function income(): static
    {
        return $this->state(fn () => [
            'type' => 'income',
        ]);
    }
}