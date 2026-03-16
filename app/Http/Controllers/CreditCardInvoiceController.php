<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Transaction;
use App\Services\CreditCardInvoiceAdvanceService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CreditCardInvoiceController extends Controller
{
    public function __construct(
        protected CreditCardInvoiceAdvanceService $advanceService
    ) {
    }

    public function advance(Request $request, Account $account)
    {
        $userId = $request->user()->id;
        abort_unless($account->user_id === $userId, 404);

        $data = $request->validate([
            'month' => ['required', 'regex:/^\d{4}-\d{2}$/'],
            'paid_bank_account_id' => ['required', 'integer'],
            'paid_at' => ['nullable', 'date'],
            'amount' => ['required', 'numeric', 'gt:0'],
            'description' => ['nullable', 'string', 'max:255'],
            'note' => ['nullable', 'string'],
        ]);

        if ((string) $account->type !== 'credit_card') {
            return back()->with('error', 'Esta conta não é um cartão de crédito.');
        }

        $bank = Account::query()
            ->where('user_id', $userId)
            ->where('id', $data['paid_bank_account_id'])
            ->firstOrFail();

        $this->advanceService->createAdvance(
            $account,
            $bank,
            $data['month'],
            (float) $data['amount'],
            $data['paid_at'] ?? null,
            $data['description'] ?? null,
            $data['note'] ?? null
        );

        return redirect()
            ->route('dashboard', ['month' => $data['month']])
            ->with('success', 'Antecipação da fatura registrada com sucesso!');
    }

    public function pay(Request $request, Account $account)
    {
        $userId = $request->user()->id;
        abort_unless($account->user_id === $userId, 404);

        $data = $request->validate([
            'month' => ['required', 'regex:/^\d{4}-\d{2}$/'],
            'paid_bank_account_id' => ['required', 'integer'],
            'paid_at' => ['nullable', 'date'],
        ]);

        if ((string) $account->type !== 'credit_card') {
            return back()->with('error', 'Esta conta não é um cartão de crédito.');
        }

        $bank = Account::query()
            ->where('user_id', $userId)
            ->where('id', $data['paid_bank_account_id'])
            ->firstOrFail();

        if ((string) $bank->type === 'credit_card') {
            return back()->with('error', 'A conta pagadora deve ser bancária (não cartão).');
        }

        $month = $data['month'];
        $paidAt = Carbon::parse($data['paid_at'] ?? now())->toDateString();

        $remainingAmount = $this->advanceService->getOutstandingAmount($userId, (int) $account->id, $month);

        if ($remainingAmount <= 0.00001) {
            return back()->with('error', 'Não há saldo em aberto para esta fatura.');
        }

        $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
        $end   = (clone $start)->endOfMonth();

        DB::transaction(function () use ($userId, $bank, $account, $month, $paidAt, $remainingAmount, $start, $end) {
            $desc = "Pagamento fatura: {$account->name} ({$month})";
            $group = (string) Str::uuid();

            Transaction::create([
                'user_id' => $userId,
                'transfer_group_id' => $group,
                'type' => 'expense',
                'amount' => $remainingAmount,
                'date' => $paidAt,
                'competence_month' => $month,
                'description' => $desc,
                'account_id' => $bank->id,
                'category_id' => null,
                'payment_method' => 'transfer',
                'is_transfer' => true,
                'is_cleared' => true,
            ]);

            Transaction::create([
                'user_id' => $userId,
                'transfer_group_id' => $group,
                'type' => 'income',
                'amount' => $remainingAmount,
                'date' => $paidAt,
                'competence_month' => $month,
                'description' => $desc,
                'account_id' => $account->id,
                'category_id' => null,
                'payment_method' => 'transfer',
                'is_transfer' => true,
                'is_cleared' => true,
            ]);

            Transaction::query()
                ->where('user_id', $userId)
                ->where('account_id', $account->id)
                ->where('is_transfer', false)
                ->where(function ($q) use ($month, $start, $end) {
                    $q->where('competence_month', $month)
                        ->orWhere(function ($q2) use ($start, $end) {
                            $q2->whereNull('competence_month')
                                ->whereBetween('date', [$start->toDateString(), $end->toDateString()]);
                        });
                })
                ->where(function ($q) {
                    $q->where('is_cleared', false)
                        ->orWhereNull('is_cleared');
                })
                ->update([
                    'is_cleared' => true,
                    'cleared_at' => $paidAt,
                    'paid_bank_account_id' => $bank->id,
                    'updated_at' => now(),
                ]);
        });

        return redirect()
            ->route('dashboard', ['month' => $month])
            ->with('success', 'Fatura paga com sucesso!');
    }
}