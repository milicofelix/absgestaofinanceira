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
            logger()->info('INSTALLMENT PAYLOAD', [
                'first_due_date' => $data['first_due_date'] ?? null,
            ]);

            if (!empty($data['first_due_date'])) {
                $firstDue = Carbon::createFromFormat('Y-m-d', $data['first_due_date'], config('app.timezone'))->startOfDay();
            } else {
                logger()->info('INSTALLMENT INPUTS', [
                    'purchase' => $purchase->toDateString(),
                    'statement_close_day' => $account->statement_close_day,
                    'due_day' => $account->due_day,
                ]);

                $dueDayRaw = (int) ($account->due_day ?? 0);
                if ($dueDayRaw <= 0) {
                    throw new \InvalidArgumentException('Conta cartão sem "dia de vencimento" (due_day). Configure a conta antes de parcelar.');
                }
                $dueDay = max(1, min(31, $dueDayRaw));

                $closeDay = max(1, min(31, (int) ($account->statement_close_day ?? 0)));

                $firstCompetence = $this->computeFirstCompetenceMonthByStatementCloseDay(
                    $purchase,
                    $closeDay,
                    $dueDay
                ); // startOfMonth()

                $firstDue = $firstCompetence->copy()
                    ->day(min($dueDay, $firstCompetence->daysInMonth))
                    ->startOfDay();
            }

            logger()->info('INSTALLMENT RESULT', [
            'purchase' => $purchase->toDateString(),
            'first_due' => $firstDue->toDateString(),
            'first_competence' => $firstDue->copy()->startOfMonth()->toDateString(),
            ]);

            $dayBase = $firstDue->day;

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

    private function computeFirstCompetenceMonthByStatementCloseDay(Carbon $purchase, int $closeDay, int $dueDay): Carbon
    {
        $closeDay = max(1, min(31, $closeDay));
        $dueDay   = max(1, min(31, $dueDay));

        $closingThisMonth = $purchase->copy()
            ->day(min($closeDay, $purchase->daysInMonth))
            ->startOfDay();

        $statementMonth = $purchase->lessThanOrEqualTo($closingThisMonth)
            ? $purchase->copy()->startOfMonth()
            : $purchase->copy()->addMonthNoOverflow()->startOfMonth();

        $dueMonth = $statementMonth->copy(); // por padrão, vence no mesmo mês do fechamento

        if ($dueDay <= $closeDay) {
            $dueMonth->addMonthNoOverflow(); // vence no próximo mês
        }

        $dueDate = $dueMonth->copy()
            ->day(min($dueDay, $dueMonth->daysInMonth))
            ->startOfDay();

        return $dueDate->copy()->startOfMonth();
    }
}
