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
use App\Data\Dashboard\DashboardFiltersData;
use App\Support\Dashboard\DashboardBaseQueryFactory;
use App\Services\Dashboard\DashboardBudgetsBadgeService;
use App\Services\Dashboard\DashboardAccountsSummaryService;
use App\Services\Dashboard\DashboardInsightsService;

class DashboardController extends Controller
{
   public function index(Request $request, DashboardBaseQueryFactory $dashboardBaseQueryFactory, DashboardBudgetsBadgeService $dashboardBudgetsBadgeService, DashboardAccountsSummaryService $dashboardAccountsSummaryService, DashboardInsightsService $dashboardInsightsService)
    {
        $userId = $request->user()->id;

        $filters = DashboardFiltersData::fromRequest($request);

        $month = $filters->month;
        $start = $filters->start;
        $end = $filters->end;

        $type = $filters->type;
        $categoryId = $filters->categoryId;
        $accountId = $filters->accountId;
        $q = $filters->q;
        $installment = $filters->installment;
        $status = $filters->status;

        $baseMonthReal = $dashboardBaseQueryFactory->monthReal($userId, $filters);

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

        $insights = $dashboardInsightsService->build($userId, $filters);

        $byCategory = $insights['byCategory'];
        $latest = $insights['latest'];

        $accountsSummary = $dashboardAccountsSummaryService->build($userId, $filters);

        $accounts = $accountsSummary['accounts'];
        $openingBalance = $accountsSummary['openingBalance'];
        $cardsSummary = $accountsSummary['cardsSummary'];

        // =========================
        // 3) Acumulados até o mês
        // =========================
        $lifetimeIncome = 0.0;
        $lifetimeExpense = 0.0;

        if (!$filters->type || $filters->type === 'income') {
            $lifetimeIncome = (float) $dashboardBaseQueryFactory
                ->lifetime($userId, $filters, 'income')
                ->sum('amount');
        }

        if (!$filters->type || $filters->type === 'expense') {
            $lifetimeExpense = (float) $dashboardBaseQueryFactory
                ->lifetime($userId, $filters, 'expense')
                ->sum('amount');
        }

        $budgetsBadge = $dashboardBudgetsBadgeService->build($userId, $filters);
        
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
            'filters' => $filters->toArray(),
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