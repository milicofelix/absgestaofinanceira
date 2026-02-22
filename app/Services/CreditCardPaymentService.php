<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Transaction;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\Category;

class CreditCardPaymentService
{
    public function payExpense(Transaction $expenseTx, int $bankAccountId, ?string $paidDate = null): void
    {
        DB::transaction(function () use ($expenseTx, $bankAccountId, $paidDate) {

            // carrega account (evita surpresa)
            $expenseTx->loadMissing('account');

            if ($expenseTx->type !== 'expense') {
                abort(422, 'Apenas despesas podem ser marcadas como pagas via pagamento de cartão.');
            }

            if (($expenseTx->account->type ?? null) !== 'credit_card') {
                abort(422, 'Esta transação não é de cartão de crédito.');
            }

            // valida banco do mesmo user
            $bank = Account::query()
                ->where('id', $bankAccountId)
                ->where('user_id', $expenseTx->user_id)
                ->firstOrFail();

            if ($bank->type === 'credit_card') {
                abort(422, 'Conta pagadora precisa ser do tipo bank (ou equivalente).');
            }

            // evita pagar duas vezes (você pode ajustar essa regra)
            if ($expenseTx->paid_at) {
                abort(422, 'Esta despesa já está marcada como paga.');
            }

            $paidAt = $paidDate
                ? Carbon::createFromFormat('Y-m-d', $paidDate, config('app.timezone'))->startOfDay()
                : now()->startOfDay();

            
            $transferCategoryId = $this->getOrCreateTransferCategoryId($expenseTx->user_id);
            if ($transferCategoryId <= 0) {
                abort(500, 'Configurar transfer_category_id (categoria de transferência).');
            }

            $group = (string) Str::uuid();

            $expenseTx->is_cleared = true;
            $expenseTx->cleared_at = $paidAt; // Carbon
            $expenseTx->paid_bank_account_id = $bank->id;
            $expenseTx->save();
            
            // banco (saída)
            Transaction::create([
                'user_id' => $expenseTx->user_id,
                'account_id' => $bank->id,
                'type' => 'expense',
                'amount' => $expenseTx->amount,
                'date' => $paidAt->toDateString(),
                'competence_month' => $paidAt->format('Y-m'),
                'description' => 'Pagamento cartão: '.$expenseTx->account->name,
                'is_transfer' => true,
                'transfer_group_id' => $group,
                'payment_method' => 'transfer',
                'is_cleared' => true,
                'cleared_at' => $paidAt,
                'category_id' => $transferCategoryId,
            ]);

            // cartão (entrada)
            Transaction::create([
                'user_id' => $expenseTx->user_id,
                'account_id' => $expenseTx->account_id,
                'type' => 'income',
                'amount' => $expenseTx->amount,
                'date' => $paidAt->toDateString(),
                'competence_month' => $paidAt->format('Y-m'),
                'description' => 'Pagamento recebido (fatura)',
                'is_transfer' => true,
                'transfer_group_id' => $group,
                'payment_method' => 'transfer',
                'is_cleared' => true,
                'cleared_at' => $paidAt,
                'category_id' => $transferCategoryId,
            ]);
        });
    }

    private function getOrCreateTransferCategoryId(int $userId): int
    {
        // Ajuste o nome como você quiser
        $name = 'Transferência';

        // Se suas categorias têm coluna "type" (income/expense), use a de expense aqui
        $q = Category::query()
            ->where('user_id', $userId)
            ->where('name', $name);

        // Se existir coluna type, descomente:
        // $q->where('type', 'expense');

        $id = (int) $q->value('id');

        if ($id > 0) return $id;

        $cat = Category::create([
            'user_id' => $userId,
            'name' => $name,
            // Se existir coluna type, descomente:
            // 'type' => 'expense',
        ]);

        return (int) $cat->id;
    }
}
