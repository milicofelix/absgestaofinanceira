<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;
use App\Models\Account;
use App\Models\CategoryBudget;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $month = $request->query('month', now()->format('Y-m'));

        $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
        $end   = (clone $start)->endOfMonth();

        // =========================
        // 1) Transações DO MÊS (cards/listas) - por COMPETÊNCIA
        // =========================
        $baseMonthReal = Transaction::query()
            ->where('user_id', $userId)
            ->where('is_transfer', false)
            ->where(function ($q) use ($month, $start, $end) {
                // competência preenchida
                $q->where('competence_month', $month)
                  // fallback: dados antigos sem competence_month
                  ->orWhere(function ($q2) use ($start, $end) {
                      $q2->whereNull('competence_month')
                         ->whereBetween('date', [$start->toDateString(), $end->toDateString()]);
                  });
            });

        $income  = (float) (clone $baseMonthReal)->where('type', 'income')->sum('amount');
        $expense = (float) (clone $baseMonthReal)->where('type', 'expense')->sum('amount');

        $byCategory = (clone $baseMonthReal)
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

        $latest = (clone $baseMonthReal)
            ->with(['category:id,name', 'account:id,name'])
            ->orderByDesc('date') // pode manter por data real
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
        // 2) Contas + agregados (SEM N+1) - por COMPETÊNCIA
        // =========================
        $accountsRaw = Account::query()
            ->where('user_id', $userId)
            ->orderBy('name')
            ->get(['id', 'name', 'type', 'initial_balance']);

        // Tudo ANTES do mês (por competência)
        $beforeAgg = Transaction::query()
            ->where('user_id', $userId)
            ->where(function ($q) use ($month, $start) {
                $q->where('competence_month', '<', $month)
                  ->orWhere(function ($q2) use ($start) {
                      $q2->whereNull('competence_month')
                         ->whereDate('date', '<', $start->toDateString());
                  });
            })
            ->selectRaw('account_id')
            ->selectRaw("COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) as inc")
            ->selectRaw("COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) as exp")
            ->groupBy('account_id')
            ->get()
            ->keyBy('account_id');

        // Só DO MÊS (por competência)
        $monthAgg = Transaction::query()
            ->where('user_id', $userId)
            ->where(function ($q) use ($month, $start, $end) {
                $q->where('competence_month', $month)
                  ->orWhere(function ($q2) use ($start, $end) {
                      $q2->whereNull('competence_month')
                         ->whereBetween('date', [$start->toDateString(), $end->toDateString()]);
                  });
            })
            ->selectRaw('account_id')
            ->selectRaw("COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) as inc")
            ->selectRaw("COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) as exp")
            ->groupBy('account_id')
            ->get()
            ->keyBy('account_id');

        // Acumulado ATÉ o fim do mês (por competência)
        // Como competence_month é "YYYY-MM", <= $month já representa "até este mês".
        $upToEndAgg = Transaction::query()
            ->where('user_id', $userId)
            ->where(function ($q) use ($month, $end) {
                $q->where('competence_month', '<=', $month)
                  ->orWhere(function ($q2) use ($end) {
                      $q2->whereNull('competence_month')
                         ->whereDate('date', '<=', $end->toDateString());
                  });
            })
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

            $openingBalance  = $initial + $beforeInc - $beforeExp;
            $monthEndBalance = $openingBalance + $monthInc - $monthExp;

            return [
                'id' => $a->id,
                'name' => $a->name,
                'type' => $a->type,

                'opening_balance' => $openingBalance,
                'income' => $monthInc,
                'expense' => $monthExp,
                'balance' => $monthEndBalance,
            ];
        })->values();

        $openingBalance = (float) $accounts->sum('opening_balance');

        // Receitas acumuladas (até o mês selecionado) - por competência
        $lifetimeIncome = (float) Transaction::query()
            ->where('user_id', $userId)
            ->where('type', 'income')
            ->where('is_transfer', false)
            ->where(function ($q) use ($month, $end) {
                $q->where('competence_month', '<=', $month)
                  ->orWhere(function ($q2) use ($end) {
                      $q2->whereNull('competence_month')
                         ->whereDate('date', '<=', $end->toDateString());
                  });
            })
            ->sum('amount');

        // Badge de metas do mês selecionado (exceeded/warning de verdade)
        $year = (int) substr($month, 0, 4);
        $m    = (int) substr($month, 5, 2);

        // metas do mês
        $budgets = CategoryBudget::query()
            ->where('user_id', $userId)
            ->where('year', $year)
            ->where('month', $m)
            ->get(['id', 'category_id', 'amount']); // <-- "amount" = limite da meta (ajuste se tiver outro nome)

        $totalBudgets = $budgets->count();

        $spentByCategory = Transaction::query()
            ->where('user_id', $userId)
            ->where('is_transfer', false)
            ->where('type', 'expense')
            ->where(function ($q) use ($month, $start, $end) {
                $q->where('competence_month', $month)
                ->orWhere(function ($q2) use ($start, $end) {
                    $q2->whereNull('competence_month')
                        ->whereBetween('date', [$start->toDateString(), $end->toDateString()]);
                });
            })
            ->whereIn('category_id', $budgets->pluck('category_id')->filter()->unique()->values())
            ->selectRaw('category_id, COALESCE(SUM(amount),0) as spent')
            ->groupBy('category_id')
            ->pluck('spent', 'category_id'); // [category_id => spent]

        $exceeded = 0;
        $warning  = 0;

        foreach ($budgets as $b) {
            $limit = (float) ($b->amount ?? 0); // ajuste se o nome for outro
            if ($limit <= 0) continue;

            $spent = (float) ($spentByCategory[$b->category_id] ?? 0);
            //$pct   = $spent / $limit;

            $spentCents = (int) round($spent * 100);
            $limitCents = (int) round($limit * 100);

            if ($spentCents > $limitCents) {
                $exceeded++;
            } elseif ($limitCents > 0 && $spentCents * 100 >= (int) round($limitCents * 80)) {
                $warning++;
            }
        }

        $budgetsBadge = [
            'month'    => $month,
            'warning'  => $warning,
            'exceeded' => $exceeded,
            'total'    => $totalBudgets,
        ];

        return Inertia::render('Dashboard', [
            'month' => $month,

            'openingBalance' => $openingBalance,
            'income' => $income,
            'expense' => $expense,

            'balance' => $openingBalance + $income - $expense,

            'lifetimeIncome' => $lifetimeIncome,

            'byCategory' => $byCategory,
            'latest' => $latest,
            'accounts' => $accounts,

            'budgetsBadge' => $budgetsBadge,
        ]);
    }
}
