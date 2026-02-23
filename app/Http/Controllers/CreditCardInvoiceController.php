<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Transaction;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CreditCardInvoiceController extends Controller
{
    public function pay(Request $request, Account $account)
    {
        $userId = $request->user()->id;

        // garante que a conta é do usuário
        abort_unless($account->user_id === $userId, 404);

        // validações básicas
        $data = $request->validate([
            'month' => ['required', 'regex:/^\d{4}-\d{2}$/'],
            'paid_bank_account_id' => ['required', 'integer'],
            'paid_at' => ['nullable', 'date'],
        ]);

        if (strtolower((string) $account->type) !== 'credit_card') {
            return back()->with('error', 'Esta conta não é um cartão de crédito.');
        }

        $bank = Account::query()
            ->where('user_id', $userId)
            ->where('id', $data['paid_bank_account_id'])
            ->firstOrFail();

        if (strtolower((string) $bank->type) === 'credit_card') {
            return back()->with('error', 'A conta pagadora deve ser bancária (não cartão).');
        }

        $month = $data['month'];
        $paidAt = Carbon::parse($data['paid_at'] ?? now())->toDateString();

        $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
        $end   = (clone $start)->endOfMonth();

        /**
         * Calcula a “fatura do mês” do cartão SOMENTE com lançamentos reais (is_transfer = false)
         * e por competência (com fallback).
         *
         * Observação importante:
         * Você pode ter convenção diferente de sinal (cartão mostrando dívida positiva ou negativa).
         * Então aqui eu faço um cálculo "adaptativo" por diferença entre inc e exp.
         */
        $cardAgg = Transaction::query()
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
            ->selectRaw("COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) as inc")
            ->selectRaw("COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) as exp")
            ->first();

        $inc = (float) ($cardAgg->inc ?? 0);
        $exp = (float) ($cardAgg->exp ?? 0);

        $diff = $inc - $exp;         // positivo => “mais income”; negativo => “mais expense”
        $invoiceAmount = abs($diff); // total a “zerar” no mês (aproximação bem consistente)

        if ($invoiceAmount <= 0.00001) {
            return back()->with('error', 'Não há fatura em aberto para este mês.');
        }

        // Regra de compensação do cartão (adaptativa):
        // - Se exp > inc (diff negativo): o cartão “fica devendo” por expense -> pagar criando INCOME no cartão
        // - Se inc > exp (diff positivo): o cartão “fica devendo” por income -> pagar criando EXPENSE no cartão
        $cardPaymentType = ($diff < 0) ? 'income' : 'expense';

        DB::transaction(function () use ($userId, $bank, $account, $month, $paidAt, $invoiceAmount, $cardPaymentType) {
            $desc = "Pagamento fatura: {$account->name} ({$month})";

            // 1) Saída do BANCO
            Transaction::create([
                'user_id' => $userId,
                'type' => 'expense',
                'amount' => $invoiceAmount,
                'date' => $paidAt,
                'competence_month' => $month,
                'description' => $desc,
                'account_id' => $bank->id,
                'category_id' => null,
                'payment_method' => 'transfer',
                'is_transfer' => true,
                'is_cleared' => true,
            ]);

            // 2) Compensação no CARTÃO (income OU expense conforme convenção do seu saldo)
            Transaction::create([
                'user_id' => $userId,
                'type' => $cardPaymentType,
                'amount' => $invoiceAmount,
                'date' => $paidAt,
                'competence_month' => $month,
                'description' => $desc,
                'account_id' => $account->id,
                'category_id' => null,
                'payment_method' => 'transfer',
                'is_transfer' => true,
                'is_cleared' => true,
            ]);
        });

        //return back()->with('success', 'Fatura paga com sucesso.');
        return redirect()
                ->route('dashboard', ['month' => $month])
                ->with('success', 'Fatura paga com sucesso!');
    }
}