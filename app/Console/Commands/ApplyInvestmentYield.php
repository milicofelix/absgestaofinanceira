<?php

namespace App\Console\Commands;

use App\Models\Account;
use App\Models\Transaction;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class ApplyInvestmentYield extends Command
{
    protected $signature = 'investments:apply-yield {date? : YYYY-MM-DD (opcional)}';
    protected $description = 'Aplica rendimento diário em contas do tipo investment baseado no CDI (BCB/SGS).';

    public function handle(): int
    {
        $date = (string) ($this->argument('date') ?: now()->toDateString());

        try {
            $day = Carbon::createFromFormat('Y-m-d', $date)->startOfDay();
        } catch (\Throwable $e) {
            $this->error('Data inválida. Use YYYY-MM-DD.');
            return self::FAILURE;
        }

        // Busca CDI diário (série 12) do BCB/SGS
        // OBS: retorna "valor" como string (ex: "0.0456") => % ao dia
        $cdi = $this->fetchCdiPercentForDate($day);
        if ($cdi === null) {
            $this->warn("CDI não encontrado para {$day->toDateString()} (talvez fim de semana/feriado).");
            return self::SUCCESS;
        }

        $countApplied = 0;

        Account::query()
            ->where('type', 'investment')
            ->where('yield_enabled', true)
            ->chunkById(50, function ($accounts) use ($day, $cdi, &$countApplied) {
                foreach ($accounts as $acc) {
                    DB::transaction(function () use ($acc, $day, $cdi, &$countApplied) {

                        // idempotência por conta/dia
                        if ($acc->last_yield_date && $acc->last_yield_date === $day->toDateString()) {
                            return;
                        }

                        // saldo até o dia (inclusive)
                        $saldo = $this->balanceAtDate($acc->id, (int)$acc->user_id, $day);
                        if ($saldo <= 0) {
                            $acc->last_yield_date = $day->toDateString();
                            $acc->save();
                            return;
                        }

                        $factor = ((float)($acc->cdi_percent ?? 100)) / 100.0;
                        $taxaEfetiva = $cdi * $factor; // % ao dia
                        $rendimento = $saldo * ($taxaEfetiva / 100.0);

                        // ignora migalhas
                        if ($rendimento >= 0.01) {
                            Transaction::create([
                                'user_id' => $acc->user_id,
                                'account_id' => $acc->id,
                                'type' => 'income',
                                'amount' => round($rendimento, 2),
                                'date' => $day->toDateString(),
                                'purchase_date' => $day->toDateString(),
                                'competence_month' => $day->format('Y-m'),
                                'description' => 'Rendimento CDI ('.number_format((float)$acc->cdi_percent, 2, ',', '.').'%)',
                                'payment_method' => 'other',
                                'is_cleared' => true,
                                'cleared_at' => $day->toDateString().' 00:00:00',
                                'is_transfer' => false,
                            ]);

                            $countApplied++;
                        }

                        $acc->last_yield_date = $day->toDateString();
                        $acc->save();
                    });
                }
            });

        $this->info("Rendimentos aplicados: {$countApplied}. CDI do dia: {$cdi}%");
        return self::SUCCESS;
    }

    private function fetchCdiPercentForDate(Carbon $day): ?float
    {
        // Busca uma janela de dias pra garantir que o dia exista
        $start = $day->copy()->subDays(10)->format('d/m/Y');
        $end   = $day->copy()->addDays(1)->format('d/m/Y');

        $url = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json&dataInicial={$start}&dataFinal={$end}";

        try {
            $rows = Http::timeout(15)->get($url)->json();
        } catch (\Throwable $e) {
            return null;
        }

        $needle = $day->format('d/m/Y');
        foreach (($rows ?: []) as $r) {
            if (($r['data'] ?? null) === $needle) {
                $v = str_replace(',', '.', (string)($r['valor'] ?? ''));
                return is_numeric($v) ? (float)$v : null; // % ao dia
            }
        }
        return null;
    }

    private function balanceAtDate(int $accountId, int $userId, Carbon $date): float
    {
        $acc = Account::query()->where('id', $accountId)->where('user_id', $userId)->first();
        if (!$acc) return 0;

        $initial = (float)($acc->initial_balance ?? 0);

        $agg = Transaction::query()
            ->where('user_id', $userId)
            ->where('account_id', $accountId)
            ->whereDate('date', '<=', $date->toDateString())
            ->selectRaw("COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) as inc")
            ->selectRaw("COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) as exp")
            ->first();

        return $initial + (float)($agg->inc ?? 0) - (float)($agg->exp ?? 0);
    }
}