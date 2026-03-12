<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCategoryBudgetRequest;
use App\Http\Requests\UpdateCategoryBudgetRequest;
use App\Models\Category;
use App\Models\CategoryBudget;
use App\Models\CategoryBudgetDefault;
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
        $end = (clone $start)->endOfMonth();
        $year = (int) $start->year;
        $month = (int) $start->month;

        // 1) Sempre partimos das categorias de despesa
        $categories = Category::query()
            ->where('user_id', $userId)
            ->where('type', 'expense')
            ->orderBy('name')
            ->get(['id', 'name', 'type']);

        // 2) Metas padrão por categoria
        $defaultBudgets = CategoryBudgetDefault::query()
            ->where('user_id', $userId)
            ->get()
            ->keyBy('category_id');

        // 3) Overrides do mês
        $monthlyBudgets = CategoryBudget::query()
            ->where('user_id', $userId)
            ->where('year', $year)
            ->where('month', $month)
            ->get()
            ->keyBy('category_id');

        // 4) Gastos do mês por categoria
        $spentByCategory = Transaction::query()
            ->where('user_id', $userId)
            ->where('is_transfer', false)
            ->where('type', 'expense')
            ->where(function ($q) use ($monthParam, $start, $end) {
                $q->where('competence_month', $monthParam)
                  ->orWhere(function ($q2) use ($start, $end) {
                      $q2->whereNull('competence_month')
                         ->whereBetween('date', [$start->toDateString(), $end->toDateString()]);
                  });
            })
            ->selectRaw('category_id, SUM(amount) as total')
            ->groupBy('category_id')
            ->pluck('total', 'category_id');

        // 5) montar tudo por categoria,
        // escolhendo override > default > sem meta
        $items = $categories->map(function (Category $category) use ($defaultBudgets, $monthlyBudgets, $spentByCategory, $monthParam) {
            $defaultBudget = $defaultBudgets->get($category->id);
            $monthlyBudget = $monthlyBudgets->get($category->id);

            $effectiveAmount = $monthlyBudget?->amount ?? $defaultBudget?->amount;
            $source = $monthlyBudget ? 'override' : ($defaultBudget ? 'default' : 'none');

            $spent = (float) ($spentByCategory[$category->id] ?? 0);
            $limit = $effectiveAmount !== null ? (float) $effectiveAmount : 0.0;

            $percent = $limit > 0 ? round(($spent / $limit) * 100) : 0;

            $status = 'none';
            if ($source !== 'none') {
                $status = 'ok';
                if ($percent >= 100) {
                    $status = 'exceeded';
                } elseif ($percent >= 70) {
                    $status = 'warning';
                }
            }

            return [
                'category_id' => $category->id,
                'category' => $category->name,

                // meta do mês (override)
                'id' => $monthlyBudget?->id,
                'override_amount' => $monthlyBudget ? (string) $monthlyBudget->amount : null,

                // meta padrão
                'default_budget_id' => $defaultBudget?->id,
                'default_amount' => $defaultBudget ? (string) $defaultBudget->amount : null,

                // meta efetiva exibida na tela
                'amount' => $effectiveAmount !== null ? number_format((float) $effectiveAmount, 2, '.', '') : null,
                'source' => $source,
                'month' => $monthParam,

                'spent' => number_format($spent, 2, '.', ''),
                'remaining' => $effectiveAmount !== null
                    ? number_format(($limit - $spent), 2, '.', '')
                    : null,
                'percent' => $percent,
                'status' => $status,
            ];
        })->values();

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
