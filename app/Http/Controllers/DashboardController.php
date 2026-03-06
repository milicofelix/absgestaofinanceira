<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;
use App\Models\Account;
use App\Models\CategoryBudget;
use App\Models\Category;

class DashboardController extends Controller
{

    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $month = $request->query('month', now()->format('Y-m'));
        $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
        $end   = (clone $start)->endOfMonth();

        // ✅ Filtros (iguais Transactions)
        $type       = $request->query('type');         // income|expense
        $categoryId = $request->query('category_id');
        $accountId  = $request->query('account_id');
        $q          = $request->query('q');
        $installment= $request->query('installment');  // only|none
        $status     = $request->query('status');       // paid|open

        // =========================
        // 1) Base do mês (por competência) + filtros
        // =========================
        $baseMonthReal = Transaction::query()
            ->where('user_id', $userId)
            ->where('is_transfer', false)
            ->where(function ($q1) use ($month, $start, $end) {
                $q1->where('competence_month', $month)
                   ->orWhere(function ($q2) use ($start, $end) {
                       $q2->whereNull('competence_month')
                          ->whereBetween('date', [$start->toDateString(), $end->toDateString()]);
                   });
            });

        // ✅ aplica filtros (mesma lógica do TransactionController)
        if ($request->filled('type')) {
            $baseMonthReal->where('type', $request->string('type')->toString());
        }
        if ($request->filled('category_id')) {
            $baseMonthReal->where('category_id', $request->integer('category_id'));
        }
        if ($request->filled('account_id')) {
            $baseMonthReal->where('account_id', $request->integer('account_id'));
        }
        if ($request->filled('q')) {
            $term = $request->string('q')->toString();
            $baseMonthReal->where(function ($qq) use ($term) {
                $qq->where('description', 'like', "%{$term}%")
                   ->orWhereHas('category', fn($c) => $c->where('name', 'like', "%{$term}%"))
                   ->orWhereHas('account', fn($a) => $a->where('name', 'like', "%{$term}%"));
            });
        }
        if ($request->filled('installment')) {
            $v = $request->string('installment')->toString();
            if ($v === 'only') {
                $baseMonthReal->whereNotNull('installment_id');
            } elseif ($v === 'none') {
                $baseMonthReal->whereNull('installment_id');
            }
        }
        if ($request->filled('status')) {
            $st = (string) $request->query('status');
            if ($st === 'paid') {
                $baseMonthReal->where('is_cleared', true);
            } elseif ($st === 'open') {
                $baseMonthReal->where('is_cleared', false);
            }
        }

        // ✅ cards (respeitam filtros)
        $income  = (float) (clone $baseMonthReal)->where('type', 'income')->sum('amount');
        $expense = (float) (clone $baseMonthReal)->where('type', 'expense')->sum('amount');

        // ✅ gráfico por categoria (naturalmente só faz sentido pra expense)
        $byCategory = (clone $baseMonthReal)
            ->where('type', 'expense')
            ->selectRaw('category_id, SUM(amount) as total')
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

        // ✅ últimos lançamentos (respeita filtros)
        $latest = (clone $baseMonthReal)
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
        // 2) Contas + agregados (SEM N+1) - por COMPETÊNCIA
        // =========================
        $accountsRaw = Account::query()
            ->where('user_id', $userId)
            ->orderBy('name')
            ->get(['id', 'name', 'type', 'initial_balance', 'statement_close_day']);

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
                'statement_close_day' => $a->statement_close_day,
            ];
        })->values();

        $openingBalanceAll = (float) $accounts->sum('opening_balance');

        // ✅ opening balance “filtrada” (se tiver conta selecionada)
        $openingBalance = $openingBalanceAll;
        if ($accountId) {
            $acc = $accounts->firstWhere('id', $accountId);
            $openingBalance = (float) ($acc['opening_balance'] ?? 0);
        }

        // =========================
        // 3) Acumulados até o mês (respeitam filtros de conta/busca/status/parcelamento e tipo)
        // =========================
        $lifetimeIncome = 0.0;
        $lifetimeExpense = 0.0;

        $buildLifetimeQuery = function (string $txType) use ($request, $userId, $month, $end) {
            $query = Transaction::query()
                ->where('user_id', $userId)
                ->where('type', $txType)
                ->where('is_transfer', false)
                ->where(function ($q1) use ($month, $end) {
                    $q1->where('competence_month', '<=', $month)
                    ->orWhere(function ($q2) use ($end) {
                        $q2->whereNull('competence_month')
                            ->whereDate('date', '<=', $end->toDateString());
                    });
                });

            if ($request->filled('category_id')) {
                $query->where('category_id', $request->integer('category_id'));
            }
            if ($request->filled('account_id')) {
                $query->where('account_id', $request->integer('account_id'));
            }
            if ($request->filled('q')) {
                $term = $request->string('q')->toString();
                $query->where(function ($qq) use ($term) {
                    $qq->where('description', 'like', "%{$term}%")
                    ->orWhereHas('category', fn($c) => $c->where('name', 'like', "%{$term}%"))
                    ->orWhereHas('account', fn($a) => $a->where('name', 'like', "%{$term}%"));
                });
            }
            if ($request->filled('installment')) {
                $v = $request->string('installment')->toString();
                if ($v === 'only') $query->whereNotNull('installment_id');
                if ($v === 'none') $query->whereNull('installment_id');
            }
            if ($request->filled('status')) {
                $st = (string) $request->query('status');
                if ($st === 'paid') $query->where('is_cleared', true);
                if ($st === 'open') $query->where('is_cleared', false);
            }

            return $query;
        };

        // Se filtro de tipo existir, só calcula o acumulado compatível
        if (!$request->filled('type') || $request->string('type')->toString() === 'income') {
            $lifetimeIncome = (float) $buildLifetimeQuery('income')->sum('amount');
        }

        if (!$request->filled('type') || $request->string('type')->toString() === 'expense') {
            $lifetimeExpense = (float) $buildLifetimeQuery('expense')->sum('amount');
        }

        // =========================
        // 4) Badge de metas (gasto do mês) + filtros
        // =========================
        $year = (int) substr($month, 0, 4);
        $m    = (int) substr($month, 5, 2);

        $budgets = CategoryBudget::query()
            ->where('user_id', $userId)
            ->where('year', $year)
            ->where('month', $m)
            ->get();

        $totalBudgets = $budgets->count();

        $spentByCategoryQuery = Transaction::query()
            ->where('user_id', $userId)
            ->where('is_transfer', false)
            ->where('type', 'expense')
            ->where(function ($q1) use ($month, $start, $end) {
                $q1->where('competence_month', $month)
                   ->orWhere(function ($q2) use ($start, $end) {
                       $q2->whereNull('competence_month')
                          ->whereBetween('date', [$start->toDateString(), $end->toDateString()]);
                   });
            })
            ->whereIn('category_id', $budgets->pluck('category_id')->filter()->unique()->values());

        // ✅ filtros que fazem sentido pro badge
        if ($request->filled('category_id')) {
            $spentByCategoryQuery->where('category_id', $request->integer('category_id'));
        }
        if ($request->filled('account_id')) {
            $spentByCategoryQuery->where('account_id', $request->integer('account_id'));
        }
        if ($request->filled('q')) {
            $term = $request->string('q')->toString();
            $spentByCategoryQuery->where(function ($qq) use ($term) {
                $qq->where('description', 'like', "%{$term}%")
                   ->orWhereHas('category', fn($c) => $c->where('name', 'like', "%{$term}%"))
                   ->orWhereHas('account', fn($a) => $a->where('name', 'like', "%{$term}%"));
            });
        }
        if ($request->filled('installment')) {
            $v = $request->string('installment')->toString();
            if ($v === 'only') $spentByCategoryQuery->whereNotNull('installment_id');
            if ($v === 'none') $spentByCategoryQuery->whereNull('installment_id');
        }
        if ($request->filled('status')) {
            $st = (string) $request->query('status');
            if ($st === 'paid') $spentByCategoryQuery->where('is_cleared', true);
            if ($st === 'open') $spentByCategoryQuery->where('is_cleared', false);
        }

        $spentByCategory = $spentByCategoryQuery
            ->selectRaw('category_id, COALESCE(SUM(amount),0) as spent')
            ->groupBy('category_id')
            ->pluck('spent', 'category_id');

        $exceeded = 0;
        $warning  = 0;

        foreach ($budgets as $b) {
            $limit = (float) ($b->amount ?? 0);
            if ($limit <= 0) continue;

            $spent = (float) ($spentByCategory[$b->category_id] ?? 0);

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

        // ✅ listas pra montar filtros no front
        $categories = Category::query()
            ->where('user_id', $userId)
            ->orderBy('type')->orderBy('name')
            ->get(['id','name','type']);

        $accountsFilter = Account::query()
            ->where('user_id', $userId)
            ->orderBy('name')
            ->get(['id','name','type','statement_close_day']);

        return Inertia::render('Dashboard', [
            'month' => $month,

            // ✅ envia filtros pro front
            'filters' => [
                'month' => $month,
                'type' => $type,
                'category_id' => $categoryId,
                'account_id' => $accountId,
                'q' => $q,
                'installment' => $installment,
                'status' => $status,
            ],

            'categories' => $categories,
            'accountsFilter' => $accountsFilter, // ✅ pra usar no select
            'accounts' => $accounts, // seu array calculado (cards das contas)

            'openingBalance' => $openingBalance,
            'income' => $income,
            'expense' => $expense,
            'balance' => $openingBalance + $income - $expense,
            'lifetimeIncome' => $lifetimeIncome,
            'lifetimeExpense' => $lifetimeExpense,
            'byCategory' => $byCategory,
            'latest' => $latest,
            'budgetsBadge' => $budgetsBadge,
        ]);
    }
}
