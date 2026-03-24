<?php

namespace App\Actions\Transactions;

use App\Models\Account;
use App\Models\Category;
use App\Models\Transaction;
use App\Services\Transactions\CompetenceMonthService;
use App\Services\Transactions\IdempotencyKeyService;
use Illuminate\Database\QueryException;

class CreateTransactionAction
{
    public function __construct(
        private CompetenceMonthService $competenceMonthService,
        private IdempotencyKeyService $idempotencyKeyService,
    ) {
    }

    public function execute(int $userId, array $data): Transaction
    {
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

        $idempotencyKey = $this->idempotencyKeyService->build(
            $userId,
            (int) $account->id,
            (string) $data['type'],
            $dateYmd,
            $data['amount'],
            $data['description'] ?? null
        );

        try {
            return Transaction::create([
                'user_id' => $userId,
                'type' => (string) $data['type'],
                'amount' => $data['amount'],
                'date' => $dateYmd,
                'purchase_date' => $dateYmd,
                'competence_month' => $competenceMonth,
                'description' => $data['description'] ?? null,
                'category_id' => (int) $data['category_id'],
                'account_id' => (int) $account->id,
                'payment_method' => $data['payment_method'] ?? null,
                'idempotency_key' => $idempotencyKey,
            ]);
        } catch (QueryException $e) {
            if ((int) ($e->errorInfo[1] ?? 0) === 1062) {
                throw $e;
            }

            throw $e;
        }
    }
}