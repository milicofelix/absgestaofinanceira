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

          //$purchase = Carbon::parse($data['purchase_date'])->startOfDay();
          $purchase = Carbon::createFromFormat('Y-m-d', $data['purchase_date'], config('app.timezone'))->startOfDay();

          // Dia base para lançar (mantém o dia da compra por padrão)
          $dayBase = $purchase->day;

          // ✅ Se o front mandou first_due_date: respeita data completa (e usa o dia dela como base)
          if (!empty($data['first_due_date'])) {
            $firstDue = Carbon::createFromFormat('Y-m-d', $data['first_due_date'], config('app.timezone'))->startOfDay();
            $dayBase  = $firstDue->day;
            } else {
              // ✅ Se não mandou: calcula o MÊS de competência pelo fechamento e monta a data usando o dia da compra
              $firstCompetence = $this->computeFirstCompetenceMonthByStatementCloseDay(
                  $purchase,
                  (int) $account->statement_close_day
              ); // vem como startOfMonth()

              $firstDue = $firstCompetence->copy()
                  ->day(min($dayBase, $firstCompetence->daysInMonth))
                  ->startOfDay();
          }

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

          // Competência começa no mês do first_due_date, mas a DATA usa o dayBase
          $competence = Carbon::parse($inst->first_due_date)->startOfMonth();

          for ($i = 1; $i <= $n; $i++) {
              $cents = $base + ($i === $n ? $remainder : 0);
              $amount = $cents / 100;

              $date = $competence->copy()
                  ->day(min($dayBase, $competence->daysInMonth))
                  ->startOfDay();

              Transaction::create([
                  'user_id' => $inst->user_id,
                  'account_id' => $inst->account_id,
                  'category_id' => $inst->category_id,
                  'type' => 'expense',
                  'description' => $inst->description ? "{$inst->description} ({$i}/{$n})" : "Parcela {$i}/{$n}",
                  'amount' => $amount,
                  'purchase_date' => $purchase->toDateString(),  // ✅  data real da compra (fixa)
                  'date' => $date->toDateString(),                 // ✅ dia da compra (clamp no fim do mês)
                  'competence_month' => $competence->format('Y-m'), // ✅ mês correto
                  'installment_id' => $inst->id,
                  'installment_number' => $i,
                  'payment_method' => 'credit_card',
              ]);

              $competence->addMonthsNoOverflow(1);
          }

          return $inst;
      });
  }

    private function computeFirstCompetenceMonthByStatementCloseDay(Carbon $purchase, int $closeDay): Carbon
    {
        $closeDay = max(1, min(28, $closeDay));

        // ✅ próximo fechamento
        $nextClose = $purchase->copy()
            ->day(min($closeDay, $purchase->daysInMonth))
            ->startOfDay();

        if ($purchase->gte($nextClose)) {
            $nextClose = $purchase->copy()
                ->addMonthNoOverflow()
                ->day($closeDay)
                ->startOfDay();
        }

        //return $nextClose->startOfMonth();
        return $nextClose->copy()->addMonthNoOverflow()->startOfMonth();

    }

}
