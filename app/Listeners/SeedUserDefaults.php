<?php

namespace App\Listeners;

use Illuminate\Auth\Events\Registered;
use App\Models\Category;
use App\Models\Account;

class SeedUserDefaults
{
    public function handle(Registered $event): void
    {
        $user = $event->user;

        // evita duplicar se o evento disparar mais de uma vez
        $already = Category::where('user_id', $user->id)->exists();
        if ($already) return;

        // Categorias padrão
        $expense = [
            'Alimentação',
            'Mercado',
            'Transporte',
            'Casa',
            'Saúde',
            'Lazer',
            'Assinaturas',
            'Educação',
            'Imprevistos',
        ];

        $income = [
            'Salário',
            'Freela',
            'Rendimentos',
            'Reembolso',
            'Outros',
        ];

        foreach ($expense as $name) {
            Category::create([
                'user_id' => $user->id,
                'name' => $name,
                'type' => 'expense',
                'color' => null,
            ]);
        }

        foreach ($income as $name) {
            Category::create([
                'user_id' => $user->id,
                'name' => $name,
                'type' => 'income',
                'color' => null,
            ]);
        }

        // Conta padrão
        Account::create([
            'user_id' => $user->id,
            'name' => 'Principal',
            'type' => 'bank',
            'initial_balance' => 0,
        ]);
    }
}
