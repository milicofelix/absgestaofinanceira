<?php

namespace App\Actions\Transactions;

use App\Models\Account;
use App\Models\Category;
use App\Models\Transaction;
use App\Services\Transactions\CompetenceMonthService;
use App\Services\Transactions\IdempotencyKeyService;
use Illuminate\Database\QueryException;

class UpdateTransactionAction
{
    public function __construct(
        private CompetenceMonthService $competenceMonthService,
        private IdempotencyKeyService $idempotencyKeyService,
    ) {
    }

    public function execute(int $userId, Transaction $transaction, array $data): Transaction
    {
        abort_unless($transaction->user_id === $userId, 403);

        $categoryOk = Category::query()
            ->where('id', (int) $data['category_id'])
            ->where('user_id', $userId)
            ->exists();

        $account = Account::query()
            ->where('id', (int) $data['account_id'])
            ->where('user_id', $userId)
            ->first();

        abort_unless($categoryOk && $account, 422);

        $dateYmd = $data['date'];

        $competenceMonth = $this->competenceMonthService->compute($account, $dateYmd);

        $purchaseYmd = $transaction->installment_id
            ? $transaction->purchase_date->format('Y-m-d')
            : $dateYmd;

        $idempotencyKey = $this->idempotencyKeyService->build(
            $userId,
            (int) $account->id,
            (string) $data['type'],
            $purchaseYmd,
            $data['amount'],
            $data['description'] ?? null
        );

        try {
            $transaction->update([
                'type' => (string) $data['type'],
                'amount' => $data['amount'],
                'date' => $dateYmd,
                'purchase_date' => $transaction->installment_id
                    ? $transaction->purchase_date
                    : $dateYmd,
                'competence_month' => $competenceMonth,
                'description' => $data['description'] ?? null,
                'category_id' => (int) $data['category_id'],
                'account_id' => (int) $account->id,
                'payment_method' => $data['payment_method'] ?? null,
                'is_cleared' => (bool) ($data['is_cleared'] ?? false),
                'idempotency_key' => $idempotencyKey,
            ]);
        } catch (QueryException $e) {
            if ((int) ($e->errorInfo[1] ?? 0) === 1062) {
                throw $e;
            }

            throw $e;
        }

        return $transaction->refresh();
    }
}