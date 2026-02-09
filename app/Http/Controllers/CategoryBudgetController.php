<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCategoryBudgetRequest;
use App\Http\Requests\UpdateCategoryBudgetRequest;
use App\Models\Category;
use App\Models\CategoryBudget;
use App\Models\Transaction;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CategoryBudgetController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $monthParam = $request->query('month', now()->format('Y-m'));
        $start = Carbon::createFromFormat('Y-m', $monthParam)->startOfMonth();
        $year = (int) $start->year;
        $month = (int) $start->month;

        // categorias de despesa (metas só pra expense)
        $categories = Category::query()
            ->where('user_id', $userId)
            ->where('type', 'expense')
            ->orderBy('name')
            ->get(['id', 'name', 'type']);

        // metas do mês
        $budgets = CategoryBudget::query()
            ->where('user_id', $userId)
            ->where('year', $year)
            ->where('month', $month)
            ->with('category:id,name,type')
            ->get();

        // gasto por categoria no mês (somente despesas)
        $spentByCategory = Transaction::query()
            ->where('user_id', $userId)
            ->where('is_transfer', false)
            ->where('type', 'expense')
            ->where(function ($q) use ($monthParam, $start) {
                // competência preenchida
                $q->where('competence_month', $monthParam)
                // fallback para dados antigos sem competence_month
                ->orWhere(function ($q2) use ($start) {
                    $q2->whereNull('competence_month')
                        ->whereBetween(
                            'date',
                            [
                                $start->toDateString(),
                                $start->copy()->endOfMonth()->toDateString()
                            ]
                        );
                });
            })
            ->selectRaw('category_id, SUM(amount) as total')
            ->groupBy('category_id')
            ->pluck('total', 'category_id');

        // monta cards por categoria com meta+gasto
        $items = $budgets->map(function (CategoryBudget $b) use ($spentByCategory) {
            $spent = (float) ($spentByCategory[$b->category_id] ?? 0);
            $limit = (float) $b->amount;
            $pct = $limit > 0 ? round(($spent / $limit) * 100) : 0;

            $status = 'ok';
            if ($pct >= 100) $status = 'exceeded';
            else if ($pct >= 70) $status = 'warning';

            return [
                'id' => $b->id,
                'category_id' => $b->category_id,
                'category' => $b->category?->name,
                'amount' => (string) $b->amount,
                'spent' => number_format($spent, 2, '.', ''),
                'remaining' => number_format(max(0, $limit - $spent), 2, '.', ''),
                'percent' => $pct,
                'status' => $status,
            ];
        });

        return Inertia::render('Budgets/Index', [
            'filters' => [
                'month' => $start->format('Y-m'),
            ],
            'categories' => $categories,
            'budgets' => $items,
        ]);
    }

    public function store(StoreCategoryBudgetRequest $request)
    {
        $userId = $request->user()->id;

        $budget = CategoryBudget::updateOrCreate(
            [
                'user_id' => $userId,
                'category_id' => $request->integer('category_id'),
                'year' => (int) $request->input('year'),
                'month' => (int) $request->input('month'),
            ],
            [
                'amount' => $request->input('amount'),
            ]
        );

        return redirect()->route('budgets.index', [
            'month' => sprintf('%04d-%02d', $budget->year, $budget->month),
        ]);
    }

    public function update(UpdateCategoryBudgetRequest $request, CategoryBudget $budget)
    {
        abort_unless($budget->user_id === $request->user()->id, 403);

        $budget->update([
            'amount' => $request->input('amount'),
        ]);

        return redirect()->route('budgets.index', [
            'month' => sprintf('%04d-%02d', $budget->year, $budget->month),
        ]);
    }

    public function destroy(Request $request, CategoryBudget $budget)
    {
        abort_unless($budget->user_id === $request->user()->id, 403);

        $month = sprintf('%04d-%02d', $budget->year, $budget->month);
        $budget->delete();

        return redirect()->route('budgets.index', ['month' => $month]);
    }
}
