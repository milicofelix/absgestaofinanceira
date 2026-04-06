<?php

namespace App\Services\Dashboard;

use App\Data\Dashboard\DashboardFiltersData;
use App\Support\Dashboard\DashboardBaseQueryFactory;

class DashboardInsightsService
{
    public function __construct(
        private DashboardBaseQueryFactory $dashboardBaseQueryFactory,
    ) {
    }

    public function build(int $userId, DashboardFiltersData $filters): array
    {
        $baseMonthReal = $this->dashboardBaseQueryFactory->monthReal($userId, $filters);

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

        return [
            'byCategory' => $byCategory,
            'latest' => $latest,
        ];
    }
}