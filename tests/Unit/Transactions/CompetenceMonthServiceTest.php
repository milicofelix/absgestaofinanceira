<?php

namespace Tests\Unit\Transactions;

use App\Models\Account;
use App\Services\Transactions\CompetenceMonthService;
use Tests\TestCase;

class CompetenceMonthServiceTest extends TestCase
{
    public function test_returns_purchase_month_for_non_credit_card_account(): void
    {
        $account = new Account([
            'type' => 'bank',
            'statement_close_day' => null,
            'due_day' => null,
        ]);

        $service = new CompetenceMonthService();

        $result = $service->compute($account, '2026-03-23');

        $this->assertSame('2026-03', $result);
    }

    public function test_returns_purchase_month_for_credit_card_without_close_day(): void
    {
        $account = new Account([
            'type' => 'credit_card',
            'statement_close_day' => null,
            'due_day' => 5,
        ]);

        $service = new CompetenceMonthService();

        $result = $service->compute($account, '2026-03-23');

        $this->assertSame('2026-03', $result);
    }

    public function test_old_rule_with_no_due_day_and_purchase_before_or_on_close_day(): void
    {
        $account = new Account([
            'type' => 'credit_card',
            'statement_close_day' => 26,
            'due_day' => null,
        ]);

        $service = new CompetenceMonthService();

        $result = $service->compute($account, '2026-03-09');

        $this->assertSame('2026-04', $result);
    }

    public function test_old_rule_with_no_due_day_and_purchase_after_close_day(): void
    {
        $account = new Account([
            'type' => 'credit_card',
            'statement_close_day' => 26,
            'due_day' => null,
        ]);

        $service = new CompetenceMonthService();

        $result = $service->compute($account, '2026-03-27');

        $this->assertSame('2026-05', $result);
    }

    public function test_new_rule_when_due_day_is_greater_than_close_day_purchase_before_close(): void
    {
        $account = new Account([
            'type' => 'credit_card',
            'statement_close_day' => 10,
            'due_day' => 20,
        ]);

        $service = new CompetenceMonthService();

        $result = $service->compute($account, '2026-03-05');

        $this->assertSame('2026-03', $result);
    }

    public function test_new_rule_when_due_day_is_greater_than_close_day_purchase_after_close(): void
    {
        $account = new Account([
            'type' => 'credit_card',
            'statement_close_day' => 10,
            'due_day' => 20,
        ]);

        $service = new CompetenceMonthService();

        $result = $service->compute($account, '2026-03-15');

        $this->assertSame('2026-04', $result);
    }

    public function test_new_rule_when_due_day_is_less_than_or_equal_to_close_day_purchase_before_close(): void
    {
        $account = new Account([
            'type' => 'credit_card',
            'statement_close_day' => 14,
            'due_day' => 10,
        ]);

        $service = new CompetenceMonthService();

        $result = $service->compute($account, '2026-03-12');

        $this->assertSame('2026-04', $result);
    }

    public function test_new_rule_when_due_day_is_less_than_or_equal_to_close_day_purchase_after_close(): void
    {
        $account = new Account([
            'type' => 'credit_card',
            'statement_close_day' => 14,
            'due_day' => 10,
        ]);

        $service = new CompetenceMonthService();

        $result = $service->compute($account, '2026-03-20');

        $this->assertSame('2026-05', $result);
    }

    public function test_purchase_on_close_day_counts_in_same_statement_month(): void
    {
        $account = new Account([
            'type' => 'credit_card',
            'statement_close_day' => 26,
            'due_day' => 5,
        ]);

        $service = new CompetenceMonthService();

        $result = $service->compute($account, '2026-03-26');

        $this->assertSame('2026-04', $result);
    }

    public function test_close_day_is_clamped_to_last_valid_day_of_month(): void
    {
        $account = new Account([
            'type' => 'credit_card',
            'statement_close_day' => 31,
            'due_day' => 5,
        ]);

        $service = new CompetenceMonthService();

        $result = $service->compute($account, '2026-02-28');

        $this->assertSame('2026-03', $result);
    }

    public function test_due_day_is_clamped_but_month_rule_remains_correct(): void
    {
        $account = new Account([
            'type' => 'credit_card',
            'statement_close_day' => 3,
            'due_day' => 31,
        ]);

        $service = new CompetenceMonthService();

        $result = $service->compute($account, '2026-03-05');

        $this->assertSame('2026-04', $result);
    }
}