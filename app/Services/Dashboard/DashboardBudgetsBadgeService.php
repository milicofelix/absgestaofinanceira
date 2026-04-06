<?php

namespace App\Services\Dashboard;

use App\Data\Dashboard\DashboardFiltersData;
use App\Models\Category;
use App\Models\CategoryBudget;
use App\Models\CategoryBudgetDefault;
use App\Support\Dashboard\DashboardBaseQueryFactory;

class DashboardBudgetsBadgeService
{
    public function __construct(
        private DashboardBaseQueryFactory $dashboardBaseQueryFactory,
    ) {
    }

    public function build(int $userId, DashboardFiltersData $filters): array
    {
        $year = (int) substr($filters->month, 0, 4);
        $monthNumber = (int) substr($filters->month, 5, 2);

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
            ->where('month', $monthNumber)
            ->get()
            ->keyBy('category_id');

        $effectiveBudgets = $expenseCategories
            ->map(function ($category) use ($defaultBudgets, $monthlyBudgets) {
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
            })
            ->filter()
            ->values();

        $totalBudgets = $effectiveBudgets->count();

        $spentByCategory = $this->dashboardBaseQueryFactory
            ->budgetsSpent(
                $userId,
                $filters,
                $effectiveBudgets->pluck('category_id')->filter()->unique()->values()->all()
            )
            ->selectRaw('category_id, COALESCE(SUM(amount),0) as spent')
            ->groupBy('category_id')
            ->pluck('spent', 'category_id');

        $exceeded = 0;
        $warning = 0;

        foreach ($effectiveBudgets as $budget) {
            $limit = (float) ($budget['amount'] ?? 0);
            if ($limit <= 0) {
                continue;
            }

            $spent = (float) ($spentByCategory[$budget['category_id']] ?? 0);

            $spentCents = (int) round($spent * 100);
            $limitCents = (int) round($limit * 100);

            if ($spentCents > $limitCents) {
                $exceeded++;
            } elseif ($limitCents > 0 && $spentCents * 100 >= (int) round($limitCents * 80)) {
                $warning++;
            }
        }

        return [
            'month' => $filters->month,
            'warning' => $warning,
            'exceeded' => $exceeded,
            'total' => $totalBudgets,
        ];
    }
}