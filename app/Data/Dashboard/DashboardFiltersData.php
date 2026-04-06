<?php

namespace App\Data\Dashboard;

use Carbon\Carbon;
use Illuminate\Http\Request;

class DashboardFiltersData
{
    public function __construct(
        public string $month,
        public Carbon $start,
        public Carbon $end,
        public ?string $type,
        public ?int $categoryId,
        public ?int $accountId,
        public ?string $q,
        public ?string $installment,
        public ?string $status,
    ) {
    }

    public static function fromRequest(Request $request): self
    {
        $month = (string) $request->query('month', now()->format('Y-m'));
        $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
        $end = (clone $start)->endOfMonth();

        return new self(
            month: $month,
            start: $start,
            end: $end,
            type: $request->query('type'),
            categoryId: $request->filled('category_id') ? $request->integer('category_id') : null,
            accountId: $request->filled('account_id') ? $request->integer('account_id') : null,
            q: $request->query('q'),
            installment: $request->query('installment'),
            status: $request->query('status'),
        );
    }

    public function toArray(): array
    {
        return [
            'month' => $this->month,
            'type' => $this->type,
            'category_id' => $this->categoryId,
            'account_id' => $this->accountId,
            'q' => $this->q,
            'installment' => $this->installment,
            'status' => $this->status,
        ];
    }
}