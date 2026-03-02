<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Transaction;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class InvestmentService
{
    public function getIndexData(int $userId, array $filters): array
    {
        $month = $filters['month']; // YYYY-MM
        [$from, $to] = $this->monthRange($month);

        $accounts = Account::query()
            ->where('user_id', $userId)
            ->where('type', 'investment')
            ->orderBy('name')
            ->get(['id','name','type','initial_balance','cdi_percent','yield_enabled','last_yield_date'])
            ->map(function (Account $acc) use ($userId, $from, $to) {
                $currentBalance = $this->balanceAtDate($acc->id, $userId, Carbon::parse($to));

                $monthIncome = Transaction::query()
                    ->where('user_id', $userId)
                    ->where('account_id', $acc->id)
                    ->whereBetween('date', [$from, $to])
                    ->where('type', 'income')
                    ->sum('amount');

                $monthExpense = Transaction::query()
                    ->where('user_id', $userId)
                    ->where('account_id', $acc->id)
                    ->whereBetween('date', [$from, $to])
                    ->where('type', 'expense')
                    ->sum('amount');

                $monthYield = Transaction::query()
                    ->where('user_id', $userId)
                    ->where('account_id', $acc->id)
                    ->whereBetween('date', [$from, $to])
                    ->where('type', 'income')
                    ->where('description', 'like', 'Rendimento CDI%')
                    ->sum('amount');

                return [
                    'id' => $acc->id,
                    'name' => $acc->name,
                    'cdi_percent' => (float) ($acc->cdi_percent ?? 100),
                    'yield_enabled' => (bool) $acc->yield_enabled,
                    'last_yield_date' => $acc->last_yield_date,
                    'initial_balance' => (float) ($acc->initial_balance ?? 0),
                    'current_balance' => (float) $currentBalance,
                    'month_income' => (float) $monthIncome,
                    'month_expense' => (float) $monthExpense,
                    'month_yield' => (float) $monthYield,
                ];
            })
            ->values();

        $totals = [
            'total_current_balance' => (float) $accounts->sum('current_balance'),
            'total_month_yield' => (float) $accounts->sum('month_yield'),
        ];

        return compact('accounts', 'totals');
    }

    public function getShowData(int $accountId, int $userId, array $filters): array
    {
        $from = Carbon::parse($filters['from'])->startOfDay();
        $to   = Carbon::parse($filters['to'])->endOfDay();

        $account = Account::query()
            ->where('id', $accountId)
            ->where('user_id', $userId)
            ->where('type', 'investment')
            ->firstOrFail(['id','name','type','initial_balance','cdi_percent','yield_enabled','last_yield_date']);

        // Resumo do período
        $income = Transaction::query()
            ->where('user_id', $userId)
            ->where('account_id', $accountId)
            ->whereBetween('date', [$from->toDateString(), $to->toDateString()])
            ->where('type', 'income')
            ->sum('amount');

        $expense = Transaction::query()
            ->where('user_id', $userId)
            ->where('account_id', $accountId)
            ->whereBetween('date', [$from->toDateString(), $to->toDateString()])
            ->where('type', 'expense')
            ->sum('amount');

        $yield = Transaction::query()
            ->where('user_id', $userId)
            ->where('account_id', $accountId)
            ->whereBetween('date', [$from->toDateString(), $to->toDateString()])
            ->where('type', 'income')
            ->where('description', 'like', 'Rendimento CDI%')
            ->sum('amount');

        $currentBalance = $this->balanceAtDate($accountId, $userId, Carbon::parse($to));

        $summary = [
            'income' => (float)$income,
            'expense' => (float)$expense,
            'yield' => (float)$yield,
            'current_balance' => (float)$currentBalance,
        ];

        // “Eventos” (lista): aportes/saques/rendimentos
        $events = Transaction::query()
            ->where('user_id', $userId)
            ->where('account_id', $accountId)
            ->whereBetween('date', [$from->toDateString(), $to->toDateString()])
            ->orderBy('date', 'desc')
            ->orderBy('id', 'desc')
            ->limit(300)
            ->get(['id','date','type','amount','description','payment_method','category_id','is_cleared'])
            ->map(fn($t) => [
                'id' => $t->id,
                'date' => $t->date,
                'type' => $t->type,
                'amount' => (float)$t->amount,
                'description' => $t->description,
                'is_yield' => str_starts_with((string)$t->description, 'Rendimento CDI'),
                'payment_method' => $t->payment_method,
                'category_id' => $t->category_id,
                'is_cleared' => (bool)$t->is_cleared,
            ])
            ->values();

        // Série para gráfico: saldo por dia (simples e eficiente p/ agora)
        $series = $this->buildDailyBalanceSeries($accountId, $userId, $from, $to);

        return [
            'account' => [
                'id' => $account->id,
                'name' => $account->name,
                'cdi_percent' => (float) ($account->cdi_percent ?? 100),
                'yield_enabled' => (bool) $account->yield_enabled,
                'last_yield_date' => $account->last_yield_date,
                'initial_balance' => (float) ($account->initial_balance ?? 0),
            ],
            'summary' => $summary,
            'series' => $series,
            'events' => $events,
        ];
    }

    private function monthRange(string $month): array
    {
        $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth()->toDateString();
        $end   = Carbon::createFromFormat('Y-m', $month)->endOfMonth()->toDateString();
        return [$start, $end];
    }

    private function balanceAtDate(int $accountId, int $userId, Carbon $date): float
    {
        $acc = Account::query()
            ->where('id', $accountId)
            ->where('user_id', $userId)
            ->first(['initial_balance']);

        if (!$acc) return 0.0;

        $initial = (float)($acc->initial_balance ?? 0);

        $agg = Transaction::query()
            ->where('user_id', $userId)
            ->where('account_id', $accountId)
            ->whereDate('date', '<=', $date->toDateString())
            ->selectRaw("COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) as inc")
            ->selectRaw("COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) as exp")
            ->first();

        return $initial + (float)($agg->inc ?? 0) - (float)($agg->exp ?? 0);
    }

    private function buildDailyBalanceSeries(int $accountId, int $userId, Carbon $from, Carbon $to): array
    {
        // Pega agregados por dia (1 query) e monta saldo acumulado
        $rows = Transaction::query()
            ->where('user_id', $userId)
            ->where('account_id', $accountId)
            ->whereBetween('date', [$from->toDateString(), $to->toDateString()])
            ->groupBy('date')
            ->orderBy('date')
            ->selectRaw("date as d")
            ->selectRaw("SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as inc")
            ->selectRaw("SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as exp")
            ->get();

        // saldo inicial até o dia anterior
        $prev = $from->copy()->subDay();
        $balance = $this->balanceAtDate($accountId, $userId, $prev);

        $byDay = [];
        foreach ($rows as $r) {
            $byDay[$r->d] = [
                'inc' => (float)$r->inc,
                'exp' => (float)$r->exp,
            ];
        }

        $out = [];
        $cursor = $from->copy();
        while ($cursor->lte($to)) {
            $key = $cursor->toDateString();
            $inc = $byDay[$key]['inc'] ?? 0.0;
            $exp = $byDay[$key]['exp'] ?? 0.0;
            $balance = $balance + $inc - $exp;

            $out[] = [
                'date' => $key,
                'balance' => (float)$balance,
            ];
            $cursor->addDay();
        }

        return $out;
    }
}