<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;
use App\Models\Category;
use App\Models\Account;

class DashboardController extends Controller
{

    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $month = $request->query('month', now()->format('Y-m'));

        $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
        $end   = (clone $start)->endOfMonth();

        // =========================
        // 1) Transações DO MÊS (cards/listas)
        // =========================
        $baseMonth = Transaction::query()
            ->where('user_id', $userId)
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()]);

        $income  = (float) (clone $baseMonth)->where('type', 'income')->sum('amount');
        $expense = (float) (clone $baseMonth)->where('type', 'expense')->sum('amount');

        $byCategory = (clone $baseMonth)
            ->selectRaw('category_id, SUM(amount) as total')
            ->where('type', 'expense')
            ->groupBy('category_id')
            ->with('category:id,name')
            ->orderByDesc('total')
            ->limit(8)
            ->get()
            ->map(fn ($row) => [
                'category_id' => $row->category_id,
                'name' => $row->category?->name ?? 'Sem categoria',
                'total' => (float) $row->total,
            ])
            ->values();

        $latest = (clone $baseMonth)
            ->with(['category:id,name', 'account:id,name'])
            ->orderByDesc('date')
            ->orderByDesc('id')
            ->limit(10)
            ->get()
            ->map(fn ($t) => [
                'id' => $t->id,
                'type' => $t->type,
                'amount' => (float) $t->amount,
                'date' => $t->date->format('Y-m-d'),
                'description' => $t->description,
                'category' => $t->category?->name,
                'account' => $t->account?->name,
            ])
            ->values();

        // =========================
        // 2) Contas + agregados (SEM N+1)
        // =========================
        $accountsRaw = Account::query()
            ->where('user_id', $userId)
            ->orderBy('name')
            ->get(['id', 'name', 'type', 'initial_balance']);

        // Tudo ANTES do mês, por conta
        $beforeAgg = Transaction::query()
            ->where('user_id', $userId)
            ->whereDate('date', '<', $start->toDateString())
            ->selectRaw('account_id')
            ->selectRaw("COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) as inc")
            ->selectRaw("COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) as exp")
            ->groupBy('account_id')
            ->get()
            ->keyBy('account_id');

        // Só DO MÊS, por conta
        $monthAgg = Transaction::query()
            ->where('user_id', $userId)
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->selectRaw('account_id')
            ->selectRaw("COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) as inc")
            ->selectRaw("COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) as exp")
            ->groupBy('account_id')
            ->get()
            ->keyBy('account_id');

        // Acumulado ATÉ o fim do mês selecionado, por conta
        $upToEndAgg = Transaction::query()
            ->where('user_id', $userId)
            ->whereDate('date', '<=', $end->toDateString())
            ->selectRaw('account_id')
            ->selectRaw("COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) as inc")
            ->selectRaw("COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) as exp")
            ->groupBy('account_id')
            ->get()
            ->keyBy('account_id');

        $accounts = $accountsRaw->map(function ($a) use ($beforeAgg, $monthAgg) {
            $initial = (float) ($a->initial_balance ?? 0);

            $beforeInc = (float) ($beforeAgg[$a->id]->inc ?? 0);
            $beforeExp = (float) ($beforeAgg[$a->id]->exp ?? 0);

            $monthInc  = (float) ($monthAgg[$a->id]->inc ?? 0);
            $monthExp  = (float) ($monthAgg[$a->id]->exp ?? 0);

            $openingBalance = $initial + $beforeInc - $beforeExp;
            $monthEndBalance = $openingBalance + $monthInc - $monthExp;

            return [
                'id' => $a->id,
                'name' => $a->name,
                'type' => $a->type,

                // ✅ agora faz sentido (baseado no histórico)
                'opening_balance' => $openingBalance,

                // ✅ só do mês
                'income' => $monthInc,
                'expense' => $monthExp,

                // ✅ saldo ao final do mês selecionado
                'balance' => $monthEndBalance,
            ];
        })->values();

        // ✅ openingBalance do dashboard (soma de todas as contas)
        $openingBalance = (float) $accounts->sum('opening_balance');

        $lifetimeIncome = (float) Transaction::query()
            ->where('user_id', $userId)
            ->where('type', 'income')
            ->whereDate('date', '<=', $end->toDateString()) // ✅ só até o fim do mês selecionado
            ->sum('amount');

        return Inertia::render('Dashboard', [
            'month' => $month,

            // cards
            'openingBalance' => $openingBalance,
            'income' => $income,
            'expense' => $expense,

            // ✅ saldo do mês = opening + entradas do mês - saídas do mês
            'balance' => $openingBalance + $income - $expense,

             // ✅ soma de tudo que já entrou, sem subtrair nada
            'lifetimeIncome' => $lifetimeIncome,

            'byCategory' => $byCategory,
            'latest' => $latest,
            'accounts' => $accounts,
        ]);
    }
}
