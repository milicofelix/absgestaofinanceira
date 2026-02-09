<?php

namespace App\Services;

use App\Models\Installment;
use App\Models\Transaction;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class InstallmentService
{
  public function createInstallmentAndTransactions(array $data): Installment
  {
    return DB::transaction(function () use ($data) {
      $inst = Installment::create([
        'user_id' => $data['user_id'],
        'account_id' => $data['account_id'],
        'category_id' => $data['category_id'] ?? null,
        'description' => $data['description'] ?? null,
        'total_amount' => $data['total_amount'],
        'installments_count' => (int)$data['installments_count'],
        'first_due_date' => $data['first_due_date'],
        'is_active' => true,
      ]);

      $n = (int)$inst->installments_count;
      $totalCents = (int) round(((float)$inst->total_amount) * 100);
      $base = intdiv($totalCents, $n);
      $remainder = $totalCents - ($base * $n);

      $due = Carbon::parse($inst->first_due_date)->startOfDay();

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
}
