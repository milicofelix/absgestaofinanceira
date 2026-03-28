<?php

namespace App\Support\Transactions;

use Illuminate\Http\Request;

class TransactionIndexRedirectParams
{
    public static function fromRequest(Request $request, ?string $month = null): array
    {
        $params = array_filter([
            'month' => $month ?: $request->input('return_month') ?: $request->query('month'),
            'type' => $request->input('return_type', $request->query('type')),
            'category_id' => $request->input('return_category_id', $request->query('category_id')),
            'account_id' => $request->input('return_account_id', $request->query('account_id')),
            'q' => $request->input('return_q', $request->query('q')),
            'installment' => $request->input('return_installment', $request->query('installment')),
            'status' => $request->input('return_status', $request->query('status')),
        ], fn ($value) => $value !== null && $value !== '');

        $rawAccountIds = $request->input('return_account_ids', $request->query('account_ids', []));

        $accountIds = collect((array) $rawAccountIds)
            ->filter(fn ($id) => is_numeric($id))
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();

        if (!empty($accountIds)) {
            $params['account_ids'] = $accountIds;
        }

        return $params;
    }
}