<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Category;
use App\Models\CreditCardInvoiceAdvance;
use App\Models\Transaction;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CreditCardInvoiceAdvanceService
{
    public function createAdvance(
        Account $creditCard,
        Account $sourceAccount,
        string $month,
        float $amount,
        ?string $paidDate = null,
        ?string $description = null,
        ?string $note = null
    ): CreditCardInvoiceAdvance {
        if ((string) $creditCard->type !== 'credit_card') {
            abort(422, 'A conta de destino deve ser um cartão de crédito.');
        }

        if ((string) $sourceAccount->type === 'credit_card') {
            abort(422, 'A conta pagadora deve ser bancária/investimento/carteira, não cartão.');
        }

        if ($creditCard->user_id !== $sourceAccount->user_id) {
            abort(422, 'As contas precisam pertencer ao mesmo usuário.');
        }

        if ($amount <= 0) {
            abort(422, 'O valor da antecipação deve ser maior que zero.');
        }

        if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
            abort(422, 'Competência inválida.');
        }

        try {
            $paidAt = $paidDate
                ? Carbon::createFromFormat('Y-m-d', $paidDate, config('app.timezone'))->startOfDay()
                : now()->startOfDay();
        } catch (\Throwable $e) {
            abort(422, 'Data de pagamento inválida.');
        }

        $userId = (int) $creditCard->user_id;

        $outstanding = $this->getOutstandingAmount($userId, (int) $creditCard->id, $month);
        $amount = round($amount, 2);

        if ($amount - $outstanding > 0.00001) {
            abort(
                422,
                'O valor informado excede o saldo em aberto da fatura. Em aberto: ' . $this->formatBRL($outstanding)
            );
        }

        $available = $this->computeAvailableBalanceAtDate($sourceAccount, $userId, $paidAt);
        if ($available + 0.00001 < $amount) {
            abort(
                422,
                'Saldo insuficiente na conta "' . $sourceAccount->name . '". Disponível: '
                . $this->formatBRL($available)
                . ' | Necessário: ' . $this->formatBRL($amount)
            );
        }

        $transferCategoryId = $this->getOrCreateTransferCategoryId($userId);
        $group = (string) Str::uuid();

        return DB::transaction(function () use (
            $userId,
            $creditCard,
            $sourceAccount,
            $month,
            $amount,
            $paidAt,
            $description,
            $note,
            $transferCategoryId,
            $group
        ) {
            $desc = $description ?: 'Antecipação fatura: ' . $creditCard->name . ' (' . $month . ')';

            $bankTx = Transaction::create([
                'user_id' => $userId,
                'account_id' => $sourceAccount->id,
                'type' => 'expense',
                'amount' => $amount,
                'date' => $paidAt->toDateString(),
                'competence_month' => $month,
                'description' => $desc,
                'note' => $note,
                'category_id' => $transferCategoryId,
                'payment_method' => 'transfer',
                'is_transfer' => true,
                'transfer_group_id' => $group,
                'is_cleared' => true,
                'cleared_at' => $paidAt,
            ]);

            $cardTx = Transaction::create([
                'user_id' => $userId,
                'account_id' => $creditCard->id,
                'type' => 'income',
                'amount' => $amount,
                'date' => $paidAt->toDateString(),
                'competence_month' => $month,
                'description' => $desc,
                'note' => $note,
                'category_id' => $transferCategoryId,
                'payment_method' => 'transfer',
                'is_transfer' => true,
                'transfer_group_id' => $group,
                'is_cleared' => true,
                'cleared_at' => $paidAt,
            ]);

            return CreditCardInvoiceAdvance::create([
                'user_id' => $userId,
                'credit_card_account_id' => $creditCard->id,
                'source_account_id' => $sourceAccount->id,
                'competence_month' => $month,
                'amount' => $amount,
                'date' => $paidAt->toDateString(),
                'description' => $desc,
                'note' => $note,
                'bank_transaction_id' => $bankTx->id,
                'card_transaction_id' => $cardTx->id,
            ]);
        });
    }

    public function getGrossInvoiceAmount(int $userId, int $cardAccountId, string $month): float
    {
        [$start, $end] = $this->monthRange($month);

        $agg = Transaction::query()
            ->where('user_id', $userId)
            ->where('account_id', $cardAccountId)
            ->where('is_transfer', false)
            ->where(function ($q) use ($month, $start, $end) {
                $q->where('competence_month', $month)
                    ->orWhere(function ($q2) use ($start, $end) {
                        $q2->whereNull('competence_month')
                            ->whereBetween('date', [$start->toDateString(), $end->toDateString()]);
                    });
            })
            ->selectRaw("COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) as exp")
            ->selectRaw("COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) as inc")
            ->first();

        $expense = (float) ($agg->exp ?? 0);
        $income  = (float) ($agg->inc ?? 0);

        // reembolso/estorno real no cartão entra como income e reduz a fatura
        return max(0, round($expense - $income, 2));
    }

    public function getPaidAmount(int $userId, int $cardAccountId, string $month): float
    {
        $paid = Transaction::query()
            ->where('user_id', $userId)
            ->where('account_id', $cardAccountId)
            ->where('type', 'income')
            ->where('is_transfer', true)
            ->where('competence_month', $month)
            ->sum('amount');

        return (float) round($paid, 2);
    }

    public function getOutstandingAmount(int $userId, int $cardAccountId, string $month): float
    {
        $gross = $this->getGrossInvoiceAmount($userId, $cardAccountId, $month);
        $paid  = $this->getPaidAmount($userId, $cardAccountId, $month);

        return max(0, round($gross - $paid, 2));
    }

    private function monthRange(string $month): array
    {
        $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
        $end   = (clone $start)->endOfMonth();

        return [$start, $end];
    }

    private function computeAvailableBalanceAtDate(Account $bank, int $userId, Carbon $date): float
    {
        $initial = (float) ($bank->initial_balance ?? 0);

        $agg = Transaction::query()
            ->where('user_id', $userId)
            ->where('account_id', $bank->id)
            ->whereDate('date', '<=', $date->toDateString())
            ->selectRaw("COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) as inc")
            ->selectRaw("COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) as exp")
            ->first();

        $inc = (float) ($agg->inc ?? 0);
        $exp = (float) ($agg->exp ?? 0);

        return round($initial + $inc - $exp, 2);
    }

    private function getOrCreateTransferCategoryId(int $userId): int
    {
        $name = 'Transferência';

        $id = (int) Category::query()
            ->where('user_id', $userId)
            ->where('name', $name)
            ->value('id');

        if ($id > 0) {
            return $id;
        }

        $cat = Category::create([
            'user_id' => $userId,
            'name' => $name,
        ]);

        return (int) $cat->id;
    }

    private function formatBRL(float $value): string
    {
        return 'R$ ' . number_format($value, 2, ',', '.');
    }
}