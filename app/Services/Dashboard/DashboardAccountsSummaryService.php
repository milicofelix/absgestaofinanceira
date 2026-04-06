<?php

namespace App\Services\Dashboard;

use App\Data\Dashboard\DashboardFiltersData;
use App\Models\Account;
use App\Models\Transaction;

class DashboardAccountsSummaryService
{
    public function build(int $userId, DashboardFiltersData $filters): array
    {
        $month = $filters->month;
        $start = $filters->start;
        $end = $filters->end;

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
        $previousEnd = $start->copy()->subMonthNoOverflow()->endOfMonth();
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

            $monthInc = (float) ($monthAgg[$a->id]->inc ?? 0);
            $monthExp = (float) ($monthAgg[$a->id]->exp ?? 0);

            $openingBalance = $initial + $beforeInc - $beforeExp;
            $monthEndBalance = $openingBalance + $monthInc - $monthExp;

            $creditLimit = $a->credit_limit !== null ? (float) $a->credit_limit : null;
            $usedLimit = null;
            $availableLimit = null;
            $invoiceAmount = 0.0;
            $invoicePaidAmount = 0.0;
            $invoiceOutstandingAmount = 0.0;
            $previousInvoiceAmount = 0.0;
            $invoicePurchaseCount = 0;

            if ($a->type === 'credit_card') {
                $realExpense = (float) ($cardLimitUsageAgg[$a->id]->real_expense ?? 0);
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
        if ($filters->accountId) {
            $acc = $accounts->firstWhere('id', $filters->accountId);
            $openingBalance = (float) ($acc['opening_balance'] ?? 0);
        }

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

        return [
            'accounts' => $accounts,
            'openingBalance' => $openingBalance,
            'cardsSummary' => $cardsSummary,
        ];
    }
}