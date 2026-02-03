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

        // formato ideal pro input type="month": YYYY-MM
        $month = $request->query('month', now()->format('Y-m'));

        $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
        $end   = (clone $start)->endOfMonth();

        // Base do mês (para listas e agregações do mês)
        $baseMonth = Transaction::query()
            ->where('user_id', $userId)
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()]);

        // ✅ Receitas / despesas DO MÊS
        $income  = (float) (clone $baseMonth)->where('type', 'income')->sum('amount');
        $expense = (float) (clone $baseMonth)->where('type', 'expense')->sum('amount');

        // ✅ Saldo inicial (acumulado antes do mês)
        // income soma, expense subtrai
        $openingBalance = (float) Transaction::query()
            ->where('user_id', $userId)
            ->where('date', '<', $start->toDateString())
            ->selectRaw("
                COALESCE(SUM(
                    CASE
                        WHEN type = 'income' THEN amount
                        WHEN type = 'expense' THEN -amount
                        ELSE 0
                    END
                ), 0) AS bal
            ")
            ->value('bal');

        // ✅ Saldo final do mês
        //$balance = $openingBalance + $income - $expense;
        $balance = $income - $expense;

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

        /**
         * ✅ CONTAS:
         * - initial_balance (configurado na conta)
         * - + saldo acumulado ANTES do mês (por conta)
         * - + receitas do mês (por conta)
         * - - despesas do mês (por conta)
         */
        $accounts = Account::query()
            ->where('user_id', $userId)
            ->withSum([
                'transactions as income_sum' => function ($q) use ($start, $end) {
                    $q->where('type', 'income')
                    ->whereBetween('date', [$start->toDateString(), $end->toDateString()]);
                }
            ], 'amount')
            ->withSum([
                'transactions as expense_sum' => function ($q) use ($start, $end) {
                    $q->where('type', 'expense')
                    ->whereBetween('date', [$start->toDateString(), $end->toDateString()]);
                }
            ], 'amount')
            // saldo acumulado antes do mês (income - expense) por conta
            ->withSum([
                'transactions as pre_balance_sum' => function ($q) use ($start) {
                    $q->where('date', '<', $start->toDateString())
                    ->selectRaw("
                        COALESCE(SUM(
                            CASE
                                WHEN type = 'income' THEN amount
                                WHEN type = 'expense' THEN -amount
                                ELSE 0
                            END
                        ), 0)
                    ");
                }
            ], 'amount')
            ->orderBy('name')
            ->get(['id', 'name', 'type', 'initial_balance'])
            ->map(function ($a) {
                $inc = (float) ($a->income_sum ?? 0);
                $exp = (float) ($a->expense_sum ?? 0);
                $initial = (float) ($a->initial_balance ?? 0);

                // pre_balance_sum pode vir nulo dependendo do driver/versão
                $pre = (float) ($a->pre_balance_sum ?? 0);

                return [
                'id' => $a->id,
                'name' => $a->name,
                'type' => $a->type,
                'initial_balance' => $initial,
                'previous_balance' => $initial + $pre, // saldo até o mês anterior
                'income' => $inc,
                'expense' => $exp,
                'balance' => $initial + $pre + $inc - $exp,
                ];

            })
            ->values();

        return Inertia::render('Dashboard', [
            'month' => $month,                 // ✅ YYYY-MM (pro input month)
            'income' => $income,               // ✅ receitas do mês
            'expense' => $expense,             // ✅ despesas do mês
            'openingBalance' => $openingBalance, // ✅ saldo anterior (acumulado)
            'balance' => $balance,             // ✅ saldo final (anterior + mês)
            'byCategory' => $byCategory,
            'latest' => $latest,
            'accounts' => $accounts,
        ]);
    }

}
