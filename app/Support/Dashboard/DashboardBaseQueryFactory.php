<?php

namespace App\Support\Dashboard;

use App\Data\Dashboard\DashboardFiltersData;
use App\Models\Transaction;
use Illuminate\Database\Eloquent\Builder;

class DashboardBaseQueryFactory
{
    public function monthReal(int $userId, DashboardFiltersData $filters): Builder
    {
        $query = Transaction::query()
            ->where('user_id', $userId)
            ->where('is_transfer', false)
            ->whereHas('account', fn ($a) => $a->where('type', '!=', 'investment'))
            ->where(function ($q1) use ($filters) {
                $q1->where('competence_month', $filters->month)
                    ->orWhere(function ($q2) use ($filters) {
                        $q2->whereNull('competence_month')
                            ->whereBetween('date', [
                                $filters->start->toDateString(),
                                $filters->end->toDateString(),
                            ]);
                    });
            });

        return $this->applyCommonFilters($query, $filters);
    }

    public function lifetime(int $userId, DashboardFiltersData $filters, string $txType): Builder
    {
        $query = Transaction::query()
            ->where('user_id', $userId)
            ->where('type', $txType)
            ->where('is_transfer', false)
            ->whereHas('account', fn ($a) => $a->where('type', '!=', 'investment'))
            ->where(function ($q1) use ($filters) {
                $q1->where('competence_month', '<=', $filters->month)
                    ->orWhere(function ($q2) use ($filters) {
                        $q2->whereNull('competence_month')
                            ->whereDate('date', '<=', $filters->end->toDateString());
                    });
            });

        return $this->applyCommonFilters($query, $filters);
    }

    public function budgetsSpent(int $userId, DashboardFiltersData $filters, array $categoryIds): Builder
    {
        $query = Transaction::query()
            ->where('user_id', $userId)
            ->where('is_transfer', false)
            ->where('type', 'expense')
            ->whereHas('account', fn ($a) => $a->where('type', '!=', 'investment'))
            ->where(function ($q1) use ($filters) {
                $q1->where('competence_month', $filters->month)
                    ->orWhere(function ($q2) use ($filters) {
                        $q2->whereNull('competence_month')
                            ->whereBetween('date', [
                                $filters->start->toDateString(),
                                $filters->end->toDateString(),
                            ]);
                    });
            })
            ->whereIn('category_id', $categoryIds);

        return $this->applyCommonFilters($query, $filters);
    }

    private function applyCommonFilters(Builder $query, DashboardFiltersData $filters): Builder
    {
        if ($filters->type) {
            $query->where('type', $filters->type);
        }

        if ($filters->categoryId) {
            $query->where('category_id', $filters->categoryId);
        }

        if ($filters->accountId) {
            $query->where('account_id', $filters->accountId);
        }

        if ($filters->q) {
            $term = $filters->q;
            $query->where(function ($qq) use ($term) {
                $qq->where('description', 'like', "%{$term}%")
                    ->orWhereHas('category', fn ($c) => $c->where('name', 'like', "%{$term}%"))
                    ->orWhereHas('account', fn ($a) => $a->where('name', 'like', "%{$term}%"));
            });
        }

        if ($filters->installment === 'only') {
            $query->whereNotNull('installment_id');
        } elseif ($filters->installment === 'none') {
            $query->whereNull('installment_id');
        }

        if ($filters->status === 'paid') {
            $query->where('is_cleared', true);
        } elseif ($filters->status === 'open') {
            $query->where('is_cleared', false);
        }

        return $query;
    }
}