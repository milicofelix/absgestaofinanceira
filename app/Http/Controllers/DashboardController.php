<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;
use App\Models\Account;
use App\Models\CategoryBudget;
use App\Models\CategoryBudgetDefault;
use App\Models\Category;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $month = $request->query('month', now()->format('Y-m'));
        $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
        $end   = (clone $start)->endOfMonth();

        $type        = $request->query('type');
        $categoryId  = $request->query('category_id');
        $accountId   = $request->query('account_id');
        $q           = $request->query('q');
        $installment = $request->query('installment');
        $status      = $request->query('status');

        // =========================
        // 1) Base do mês (por competência) + filtros
        // =========================
        $baseMonthReal = Transaction::query()
            ->where('user_id', $userId)
            ->where('is_transfer', false)
            ->whereHas('account', fn ($a) => $a->where('type', '!=', 'investment'))
            ->where(function ($q1) use ($month, $start, $end) {
                $q1->where('competence_month', $month)
                   ->orWhere(function ($q2) use ($start, $end) {
                       $q2->whereNull('competence_month')
                          ->whereBetween('date', [$start->toDateString(), $end->toDateString()]);
                   });
            });

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
                   ->orWhereHas('category', fn ($c) => $c->where('name', 'like', "%{$term}%"))
                   ->orWhereHas('account', fn ($a) => $a->where('name', 'like', "%{$term}%"));
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

        $income  = (float) (clone $baseMonthReal)->where('type', 'income')->sum('amount');
        $expense = (float) (clone $baseMonthReal)->where('type', 'expense')->sum('amount');

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
        // 2) Contas + agregados
        // =========================
        $accountsRaw = Account::query()
            ->where('user_id', $userId)
            ->where('type', '!=', 'investment')
            ->orderBy('name')
            ->get(['id', 'name', 'type', 'initial_balance', 'statement_close_day', 'credit_limit']);

        $beforeAgg = Transaction::query()
            ->where('user_id', $userId)
            ->whereHas('account', fn ($a) => $a->where('type', '!=', 'investment'))
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

        $monthAgg = Transaction::query()
            ->where('user_id', $userId)
            ->whereHas('account', fn ($a) => $a->where('type', '!=', 'investment'))
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

        $invoiceGrossAgg = Transaction::query()
            ->where('user_id', $userId)
            ->where('is_transfer', false)
            ->whereHas('account', fn ($a) => $a->where('type', '!=', 'investment'))
            ->where(function ($q) use ($month, $start, $end) {
                $q->where('competence_month', $month)
                  ->orWhere(function ($q2) use ($start, $end) {
                      $q2->whereNull('competence_month')
                         ->whereBetween('date', [$start->toDateString(), $end->toDateString()]);
                  });
            })
            ->selectRaw('account_id')
            ->selectRaw("COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) as exp")
            ->selectRaw("COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) as inc")
            ->groupBy('account_id')
            ->get()
            ->keyBy('account_id');

        $invoicePaidAgg = Transaction::query()
            ->where('user_id', $userId)
            ->where('type', 'income')
            ->where('is_transfer', true)
            ->whereHas('account', fn ($a) => $a->where('type', '!=', 'investment'))
            ->where('competence_month', $month)
            ->selectRaw('account_id')
            ->selectRaw('COALESCE(SUM(amount),0) as total')
            ->groupBy('account_id')
            ->get()
            ->keyBy('account_id');

        $invoiceCountAgg = Transaction::query()
            ->where('user_id', $userId)
            ->where('type', 'expense')
            ->where('is_transfer', false)
            ->whereHas('account', fn ($a) => $a->where('type', '!=', 'investment'))
            ->where(function ($q) use ($month, $start, $end) {
                $q->where('competence_month', $month)
                  ->orWhere(function ($q2) use ($start, $end) {
                      $q2->whereNull('competence_month')
                         ->whereBetween('date', [$start->toDateString(), $end->toDateString()]);
                  });
            })
            ->selectRaw('account_id')
            ->selectRaw('COUNT(*) as qty')
            ->groupBy('account_id')
            ->get()
            ->keyBy('account_id');

        $cardLimitUsageAgg = Transaction::query()
            ->where('user_id', $userId)
            ->whereHas('account', fn ($a) => $a->where('type', '!=', 'investment'))
            ->selectRaw('account_id')
            ->selectRaw("
                COALESCE(SUM(
                    CASE
                        WHEN type = 'expense'
                             AND is_transfer = 0
                             AND DATE(COALESCE(purchase_date, date)) <= ?
                        THEN amount
                        ELSE 0
                    END
                ),0) as real_expense
            ", [$end->toDateString()])
            ->selectRaw("
                COALESCE(SUM(
                    CASE
                        WHEN type = 'income'
                             AND is_transfer = 1
                             AND DATE(date) <= ?
                        THEN amount
                        ELSE 0
                    END
                ),0) as payment_income
            ", [$end->toDateString()])
            ->groupBy('account_id')
            ->get()
            ->keyBy('account_id');

        $previousStart = $start->copy()->subMonthNoOverflow()->startOfMonth();
        $previousEnd   = $start->copy()->subMonthNoOverflow()->endOfMonth();
        $previousMonth = $previousStart->format('Y-m');

        $previousInvoiceAmountAgg = Transaction::query()
            ->where('user_id', $userId)
            ->where('type', 'expense')
            ->where('is_transfer', false)
            ->whereHas('account', fn ($a) => $a->where('type', '!=', 'investment'))
            ->where(function ($q) use ($previousMonth, $previousStart, $previousEnd) {
                $q->where('competence_month', $previousMonth)
                  ->orWhere(function ($q2) use ($previousStart, $previousEnd) {
                      $q2->whereNull('competence_month')
                         ->whereBetween('date', [$previousStart->toDateString(), $previousEnd->toDateString()]);
                  });
            })
            ->selectRaw('account_id')
            ->selectRaw('COALESCE(SUM(amount),0) as total')
            ->groupBy('account_id')
            ->get()
            ->keyBy('account_id');

        $accounts = $accountsRaw->map(function ($a) use (
            $beforeAgg,
            $monthAgg,
            $cardLimitUsageAgg,
            $invoiceCountAgg,
            $invoiceGrossAgg,
            $invoicePaidAgg,
            $previousInvoiceAmountAgg
        ) {
            $initial = (float) ($a->initial_balance ?? 0);

            $beforeInc = (float) ($beforeAgg[$a->id]->inc ?? 0);
            $beforeExp = (float) ($beforeAgg[$a->id]->exp ?? 0);

            $monthInc  = (float) ($monthAgg[$a->id]->inc ?? 0);
            $monthExp  = (float) ($monthAgg[$a->id]->exp ?? 0);

            $openingBalance  = $initial + $beforeInc - $beforeExp;
            $monthEndBalance = $openingBalance + $monthInc - $monthExp;

            $creditLimit = $a->credit_limit !== null ? (float) $a->credit_limit : null;
            $usedLimit = null;
            $availableLimit = null;
            $invoiceAmount = 0.0; // bruto líquido (despesas - reembolsos)
            $invoicePaidAmount = 0.0;
            $invoiceOutstandingAmount = 0.0;
            $previousInvoiceAmount = 0.0;
            $invoicePurchaseCount = 0;

            if ($a->type === 'credit_card') {
                $realExpense   = (float) ($cardLimitUsageAgg[$a->id]->real_expense ?? 0);
                $paymentIncome = (float) ($cardLimitUsageAgg[$a->id]->payment_income ?? 0);

                $usedLimit = max(0, $realExpense - $paymentIncome);

                if ($creditLimit !== null) {
                    $availableLimit = max(0, $creditLimit - $usedLimit);
                }

                $invoicePurchaseCount = (int) ($invoiceCountAgg[$a->id]->qty ?? 0);

                $grossExp = (float) ($invoiceGrossAgg[$a->id]->exp ?? 0);
                $grossInc = (float) ($invoiceGrossAgg[$a->id]->inc ?? 0);
                $invoiceAmount = max(0, $grossExp - $grossInc);

                $invoicePaidAmount = (float) ($invoicePaidAgg[$a->id]->total ?? 0);
                $invoiceOutstandingAmount = max(0, $invoiceAmount - $invoicePaidAmount);

                $previousInvoiceAmount = (float) ($previousInvoiceAmountAgg[$a->id]->total ?? 0);
            }

            return [
                'id' => $a->id,
                'name' => $a->name,
                'type' => $a->type,
                'initial_balance' => $initial,
                'opening_balance' => $openingBalance,
                'income' => $monthInc,
                'expense' => $monthExp,
                'balance' => $monthEndBalance,
                'statement_close_day' => $a->statement_close_day,
                'credit_limit' => $creditLimit,
                'used_limit' => $usedLimit,
                'available_limit' => $availableLimit,
                'invoice_purchase_count' => $invoicePurchaseCount,
                'invoice_amount' => $invoiceAmount,
                'invoice_paid_amount' => $invoicePaidAmount,
                'invoice_outstanding_amount' => $invoiceOutstandingAmount,
                'previous_invoice_amount' => $previousInvoiceAmount, 
            ];
        })->values();

        $openingBalanceAll = (float) $accounts->sum('opening_balance');

        $openingBalance = $openingBalanceAll;
        if ($accountId) {
            $acc = $accounts->firstWhere('id', $accountId);
            $openingBalance = (float) ($acc['opening_balance'] ?? 0);
        }

        // =========================
        // 2.1) Resumo consolidado dos cartões
        // =========================
        $cardsOnly = $accounts->filter(fn ($a) => ($a['type'] ?? null) === 'credit_card')->values();

        $cardsSummary = [
            'total_limit' => (float) $cardsOnly->sum(fn ($a) => (float) ($a['credit_limit'] ?? 0)),
            'total_used' => (float) $cardsOnly->sum(fn ($a) => (float) ($a['used_limit'] ?? 0)),
            'total_available' => (float) $cardsOnly->sum(fn ($a) => (float) ($a['available_limit'] ?? 0)),
            'total_invoice' => (float) $cardsOnly->sum(fn ($a) => (float) ($a['invoice_amount'] ?? 0)),
            'total_paid_invoice' => (float) $cardsOnly->sum(fn ($a) => (float) ($a['invoice_paid_amount'] ?? 0)),
            'total_outstanding_invoice' => (float) $cardsOnly->sum(fn ($a) => (float) ($a['invoice_outstanding_amount'] ?? 0)),
            'total_purchase_count' => (int) $cardsOnly->sum(fn ($a) => (int) ($a['invoice_purchase_count'] ?? 0)),
            'total_previous_invoice' => (float) $cardsOnly->sum(fn ($a) => (float) ($a['previous_invoice_amount'] ?? 0)),
            'cards_count' => (int) $cardsOnly->count(),
        ];

        // =========================
        // 3) Acumulados até o mês
        // =========================
        $lifetimeIncome = 0.0;
        $lifetimeExpense = 0.0;

        $buildLifetimeQuery = function (string $txType) use ($request, $userId, $month, $end) {
            $query = Transaction::query()
                ->where('user_id', $userId)
                ->where('type', $txType)
                ->where('is_transfer', false)
                ->whereHas('account', fn ($a) => $a->where('type', '!=', 'investment'))
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
                       ->orWhereHas('category', fn ($c) => $c->where('name', 'like', "%{$term}%"))
                       ->orWhereHas('account', fn ($a) => $a->where('name', 'like', "%{$term}%"));
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

        if (!$request->filled('type') || $request->string('type')->toString() === 'income') {
            $lifetimeIncome = (float) $buildLifetimeQuery('income')->sum('amount');
        }

        if (!$request->filled('type') || $request->string('type')->toString() === 'expense') {
            $lifetimeExpense = (float) $buildLifetimeQuery('expense')->sum('amount');
        }

        // =========================
        // 4) Badge de metas (agora com herança automática)
        // =========================
        $year = (int) substr($month, 0, 4);
        $m    = (int) substr($month, 5, 2);

        $expenseCategories = Category::query()
            ->where('user_id', $userId)
            ->where('type', 'expense')
            ->get(['id']);

        $defaultBudgets = CategoryBudgetDefault::query()
            ->where('user_id', $userId)
            ->get()
            ->keyBy('category_id');

        $monthlyBudgets = CategoryBudget::query()
            ->where('user_id', $userId)
            ->where('year', $year)
            ->where('month', $m)
            ->get()
            ->keyBy('category_id');

        // meta efetiva por categoria = override > default
        $effectiveBudgets = $expenseCategories->map(function ($category) use ($defaultBudgets, $monthlyBudgets) {
            $monthly = $monthlyBudgets->get($category->id);
            $default = $defaultBudgets->get($category->id);

            $amount = $monthly?->amount ?? $default?->amount;

            if ($amount === null) {
                return null;
            }

            return [
                'category_id' => $category->id,
                'amount' => (float) $amount,
            ];
        })->filter()->values();

        $totalBudgets = $effectiveBudgets->count();

        $spentByCategoryQuery = Transaction::query()
            ->where('user_id', $userId)
            ->where('is_transfer', false)
            ->where('type', 'expense')
            ->whereHas('account', fn ($a) => $a->where('type', '!=', 'investment'))
            ->where(function ($q1) use ($month, $start, $end) {
                $q1->where('competence_month', $month)
                   ->orWhere(function ($q2) use ($start, $end) {
                       $q2->whereNull('competence_month')
                          ->whereBetween('date', [$start->toDateString(), $end->toDateString()]);
                   });
            })
            ->whereIn('category_id', $effectiveBudgets->pluck('category_id')->filter()->unique()->values());


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
                   ->orWhereHas('category', fn ($c) => $c->where('name', 'like', "%{$term}%"))
                   ->orWhereHas('account', fn ($a) => $a->where('name', 'like', "%{$term}%"));
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

        foreach ($effectiveBudgets as $b) {
            $limit = (float) ($b['amount'] ?? 0);
            if ($limit <= 0) continue;

            $spent = (float) ($spentByCategory[$b['category_id']] ?? 0);

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

        $categories = Category::query()
            ->where('user_id', $userId)
            ->orderBy('type')->orderBy('name')
            ->get(['id', 'name', 'type']);

        $accountsFilter = Account::query()
            ->where('user_id', $userId)
            ->where('type', '!=', 'investment')
            ->orderBy('name')
            ->get(['id', 'name', 'type', 'statement_close_day']);

        return Inertia::render('Dashboard', [
            'month' => $month,
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
            'accountsFilter' => $accountsFilter,
            'accounts' => $accounts,
            'cardsSummary' => $cardsSummary,

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