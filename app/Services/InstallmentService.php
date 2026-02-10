<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Installment;
use App\Models\Transaction;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class InstallmentService
{
  public function createInstallmentAndTransactions(array $data): Installment
  {
    return DB::transaction(function () use ($data) {

      $account = Account::query()
        ->where('id', $data['account_id'])
        ->where('user_id', $data['user_id'])
        ->firstOrFail();

      $purchase = Carbon::parse($data['purchase_date'])->startOfDay();

      // ✅ se o front mandou first_due_date, respeita; senão calcula pelo fechamento da conta
      $firstDue = !empty($data['first_due_date'])
        ? Carbon::parse($data['first_due_date'])->startOfDay()
        : $this->computeFirstDueByStatementCloseDay($purchase, (int) $account->statement_close_day);

      $inst = Installment::create([
        'user_id' => $data['user_id'],
        'account_id' => $data['account_id'],
        'category_id' => $data['category_id'] ?? null,
        'description' => $data['description'] ?? null,
        'total_amount' => $data['total_amount'],
        'installments_count' => (int) $data['installments_count'],
        'first_due_date' => $firstDue->toDateString(),
        'is_active' => true,
      ]);

      $n = (int) $inst->installments_count;
      $totalCents = (int) round(((float) $inst->total_amount) * 100);
      $base = intdiv($totalCents, $n);
      $remainder = $totalCents - ($base * $n);

      //$due = Carbon::parse($inst->first_due_date)->startOfDay();
      $due = Carbon::parse($inst->first_due_date)->startOfDay()->startOfMonth();

      for ($i = 1; $i <= $n; $i++) {
        $cents = $base + ($i === $n ? $remainder : 0);
        $amount = $cents / 100;

        Transaction::create([
          'user_id' => $inst->user_id,
          'account_id' => $inst->account_id,
          'category_id' => $inst->category_id,
          'type' => 'expense',
          'description' => $inst->description ? "{$inst->description} ({$i}/{$n})" : "Parcela {$i}/{$n}",
          'amount' => $amount,
          'date' => $due->toDateString(),
          'competence_month' => $due->format('Y-m'),
          'installment_id' => $inst->id,
          'installment_number' => $i,
        ]);

        $due = $due->copy()->addMonthsNoOverflow(1);
      }

      return $inst;
    });
  }

  private function computeFirstDueByStatementCloseDay(Carbon $purchase, int $closeDay): Carbon
  {
    // normaliza range 1..28 (evita meses sem dia 29/30/31)
    $closeDay = max(1, min(28, $closeDay));

    // fechamento do mês da compra (mesmo mês)
    $closeThisMonth = $purchase->copy()->day(min($closeDay, $purchase->daysInMonth))->startOfDay();

    // Se comprou DEPOIS do fechamento, vai pra próxima fatura (mês seguinte)
    // if ($purchase->gt($closeThisMonth)) {
    if ($purchase->gte($closeThisMonth)) {
      $next = $purchase->copy()->addMonthNoOverflow();
      return $next->day(min($closeDay, $next->daysInMonth))->startOfDay();
    }

    // Se comprou ATÉ o fechamento, cai na fatura do mês
    return $closeThisMonth;
  }
}
