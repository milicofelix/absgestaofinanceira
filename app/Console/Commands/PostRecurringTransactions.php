<?php

// app/Console/Commands/PostRecurringTransactions.php
namespace App\Console\Commands;

use App\Models\RecurringTransaction;
use App\Models\Transaction;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class PostRecurringTransactions extends Command
{
  protected $signature = 'recurring:post {--date= : Forçar data base (YYYY-MM-DD)}';
  protected $description = 'Gera lançamentos de recorrências com next_run_date <= hoje';

  public function handle(): int
  {
    $today = $this->option('date')
      ? Carbon::parse($this->option('date'))->startOfDay()
      : now()->startOfDay();

    $count = 0;

    // processa em lotes para não estourar memória
    RecurringTransaction::query()
      ->where('is_active', true)
      ->where('auto_post', true)
      ->whereDate('next_run_date', '<=', $today->toDateString())
      ->orderBy('id')
      ->chunkById(200, function ($rows) use ($today, &$count) {
        foreach ($rows as $rec) {
          DB::transaction(function () use ($rec, $today, &$count) {
            // se já passou várias datas (ex: sistema ficou off), gera em loop até alcançar hoje
            while ($rec->is_active && $rec->next_run_date->lte($today)) {

              if ($rec->end_date && $rec->next_run_date->gt($rec->end_date)) {
                $rec->is_active = false;
                $rec->save();
                break;
              }

              Transaction::create([
                'user_id' => $rec->user_id,
                'account_id' => $rec->account_id,
                'category_id' => $rec->category_id,
                'type' => $rec->type,
                'description' => $rec->description,
                'amount' => $rec->amount,
                'date' => $rec->next_run_date->toDateString(),
                'competence_month' => $rec->next_run_date->format('Y-m'),
                'recurring_id' => $rec->id,
              ]);

              $count++;

              // calcula próxima
              $next = $rec->next_run_date->copy();
              if ($rec->frequency === 'monthly') {
                $next->addMonthsNoOverflow(max(1, (int)$rec->interval));
              } else { // yearly
                $next->addYears(max(1, (int)$rec->interval));
              }
              $rec->next_run_date = $next;
              $rec->save();
            }
          });
        }
      });

    $this->info("Recorrências lançadas: {$count}");
    return self::SUCCESS;
  }
}
