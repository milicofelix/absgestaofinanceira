<?php

namespace App\Services\Transactions;

use App\Models\Account;
use Carbon\Carbon;

class CompetenceMonthService
{
    public function compute(Account $account, string $dateYmd): string
    {
        $purchase = Carbon::createFromFormat('Y-m-d', $dateYmd, config('app.timezone'))->startOfDay();

        if (($account->type ?? null) !== 'credit_card' || empty($account->statement_close_day)) {
            return $purchase->format('Y-m');
        }

        $closeDay = max(1, min(31, (int) $account->statement_close_day));

        $dueDayRaw = (int) ($account->due_day ?? 0);
        if ($dueDayRaw <= 0) {
            $closingThisMonth = $purchase->copy()->day(min($closeDay, $purchase->daysInMonth))->startOfDay();

            $statementMonth = $purchase->lessThanOrEqualTo($closingThisMonth)
                ? $purchase->copy()
                : $purchase->copy()->addMonthNoOverflow();

            return $statementMonth->copy()->addMonthNoOverflow()->format('Y-m');
        }

        $dueDay = max(1, min(31, $dueDayRaw));

        $closingThisMonth = $purchase->copy()->day(min($closeDay, $purchase->daysInMonth))->startOfDay();

        $statementMonth = $purchase->lessThanOrEqualTo($closingThisMonth)
            ? $purchase->copy()
            : $purchase->copy()->addMonthNoOverflow();

        $dueMonth = $statementMonth->copy()->startOfMonth();

        if ($dueDay <= $closeDay) {
            $dueMonth->addMonthNoOverflow();
        }

        return $dueMonth->format('Y-m');
    }
}