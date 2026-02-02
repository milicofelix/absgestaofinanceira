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

        $base = Transaction::query()
            ->where('user_id', $userId)
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()]);

        $income  = (float) (clone $base)->where('type', 'income')->sum('amount');
        $expense = (float) (clone $base)->where('type', 'expense')->sum('amount');

        $byCategory = (clone $base)
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

        $latest = (clone $base)
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

        $accounts = Account::query()
            ->where('user_id', $userId)
            ->withSum(['transactions as income_sum' => function ($q) use ($start, $end) {
                $q->where('type', 'income')->whereBetween('date', [$start->toDateString(), $end->toDateString()]);
            }], 'amount')
            ->withSum(['transactions as expense_sum' => function ($q) use ($start, $end) {
                $q->where('type', 'expense')->whereBetween('date', [$start->toDateString(), $end->toDateString()]);
            }], 'amount')
            ->orderBy('name')
            ->get(['id','name','type','initial_balance'])
            ->map(function ($a) {
                $inc = (float) ($a->income_sum ?? 0);
                $exp = (float) ($a->expense_sum ?? 0);
                $initial = (float) ($a->initial_balance ?? 0);

                return [
                    'id' => $a->id,
                    'name' => $a->name,
                    'type' => $a->type,
                    'initial_balance' => $initial,
                    'income' => $inc,
                    'expense' => $exp,
                    'balance' => $initial + $inc - $exp,
                ];
            })
            ->values();

        return Inertia::render('Dashboard', [
            'month' => $month,                 // ✅ YYYY-MM (pro input month)
            'income' => $income,
            'expense' => $expense,
            'balance' => $income - $expense,
            'byCategory' => $byCategory,
            'latest' => $latest,
            'accounts' => $accounts,
        ]);
    }

}
