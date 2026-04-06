<?php

namespace App\Console\Commands;

use App\Models\Account;
use App\Models\Transaction;
use App\Models\Category;
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
        try {
            $day = $this->argument('date')
                ? Carbon::createFromFormat('Y-m-d', $this->argument('date'))->startOfDay()
                : now()->startOfDay();

            if ($day->isWeekend()) {
                $this->info("Data {$day->toDateString()} é fim de semana. Nenhuma simulação será gerada.");
                return self::SUCCESS;
            }

        } catch (\Throwable $e) {
            $this->error('Data inválida. Use YYYY-MM-DD.');
            return self::FAILURE;
        }

        // Busca CDI diário (série 12) do BCB/SGS
        // OBS: retorna "valor" como string (ex: "0.0456") => % ao dia
        $cdi = $this->fetchCdiPercentForDate($day);
        if ($cdi === null) {
            $this->warn("Nenhum CDI disponível foi encontrado até {$day->toDateString()}.");
            return self::SUCCESS;
        }

        $countApplied = 0;
        $countSkipped = 0;

        $incomeCategoryIds = Category::query()
            ->where('type', 'income')
            ->orderByRaw("CASE WHEN name = 'Rendimentos' THEN 0 ELSE 1 END")
            ->orderBy('name')
            ->get(['id', 'user_id', 'name'])
            ->groupBy('user_id')
            ->map(fn ($items) => (int) $items->first()->id);

        Account::query()
            ->where('type', 'investment')
            ->where('yield_enabled', true)
            ->chunkById(50, function ($accounts) use ($day, $cdi, $incomeCategoryIds, &$countApplied, &$countSkipped) {
                foreach ($accounts as $acc) {
                    DB::transaction(function () use ($acc, $day, $cdi, $incomeCategoryIds, &$countApplied, &$countSkipped) {

                        // se a simulação já foi aplicada, ignora
                        $lastYieldDate = $acc->last_yield_date
                            ? Carbon::parse($acc->last_yield_date)->toDateString()
                            : null;

                        if ($lastYieldDate === $day->toDateString()) {
                            $this->line("Simulação já aplicada em {$day->toDateString()} para a conta {$acc->name}.");
                            $countSkipped++;
                            return;
                        }

                        $alreadyExists = Transaction::query()
                            ->where('user_id', $acc->user_id)
                            ->where('account_id', $acc->id)
                            ->where('type', 'income')
                            ->whereDate('date', $day->toDateString())
                            ->where('description', 'like', 'Simulação de rendimento CDI%')
                            ->exists();

                        if ($alreadyExists) {
                            $this->line("Simulação já registrada em {$day->toDateString()} para a conta {$acc->name}.");
                            $countSkipped++;
                            return;
                        }

                        // saldo até o dia (inclusive)
                        $saldo = $this->balanceAtDate($acc->id, (int)$acc->user_id, $day);
                        if ($saldo <= 0) {
                            $acc->last_yield_date = $day->toDateString();
                            $acc->save();
                            return;
                        }

                        $rendimento = $this->calculateTieredYield($acc, $saldo, $cdi);

                        // ignora migalhas
                        if ($rendimento >= 0.01) {
                            $yieldCategoryId = $incomeCategoryIds->get((int) $acc->user_id);

                            $cdiPercentValue = (float) ($acc->cdi_percent ?? 100);
                            $cdiPercentLabel = fmod($cdiPercentValue, 1.0) === 0.0
                                ? number_format($cdiPercentValue, 0, ',', '.')
                                : number_format($cdiPercentValue, 2, ',', '.');

                            Transaction::create([
                                'user_id' => $acc->user_id,
                                'account_id' => $acc->id,
                                'category_id' => $yieldCategoryId,
                                'type' => 'income',
                                'amount' => round($rendimento, 2),
                                'date' => $day->toDateString(),
                                'purchase_date' => $day->toDateString(),
                                'competence_month' => $day->format('Y-m'),
                                'description' => $this->buildYieldDescription($acc),
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

        $this->info("Simulações aplicadas: {$countApplied}. Ignoradas por duplicidade: {$countSkipped}. CDI usado: {$cdi}%");
        return self::SUCCESS;
    }

    private function fetchCdiPercentForDate(Carbon $day): ?float
    {
        // Busca uma janela de dias para encontrar o último CDI disponível
        $start = $day->copy()->subDays(15)->format('d/m/Y');
        $end   = $day->copy()->format('d/m/Y');

        $url = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json&dataInicial={$start}&dataFinal={$end}";

        try {
            $rows = Http::timeout(15)->get($url)->json();
        } catch (\Throwable $e) {
            return null;
        }

        if (!is_array($rows) || empty($rows)) {
            return null;
        }

        $target = $day->copy()->startOfDay();
        $lastValid = null;

        foreach ($rows as $r) {
            $rawDate = $r['data'] ?? null;
            $rawValue = $r['valor'] ?? null;

            if (!$rawDate || $rawValue === null) {
                continue;
            }

            try {
                $rowDate = Carbon::createFromFormat('d/m/Y', $rawDate)->startOfDay();
            } catch (\Throwable $e) {
                continue;
            }

            if ($rowDate->lte($target)) {
                $v = str_replace(',', '.', (string) $rawValue);

                if (is_numeric($v)) {
                    $lastValid = (float) $v;
                }
            }
        }

        return $lastValid;
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

    private function calculateTieredYield(Account $acc, float $saldo, float $cdiDailyPercent): float
    {
        if ($saldo <= 0) {
            return 0.0;
        }

        // Regra principal da conta
        $basePercent = (float) ($acc->cdi_percent ?? 100);

        // Nova regra opcional de faixa
        $capAmount = $this->resolveYieldCapAmount($acc); // ex: 5000.00
        $aboveCapPercent = $this->resolveAboveCapCdiPercent($acc); // ex: 100.00

        // Se não houver faixa configurada, mantém comportamento antigo
        if ($capAmount <= 0 || $saldo <= $capAmount) {
            return $this->calculateYieldPortion($saldo, $cdiDailyPercent, $basePercent);
        }

        $tier1Amount = min($saldo, $capAmount);
        $tier2Amount = max(0, $saldo - $capAmount);

        $tier1Yield = $this->calculateYieldPortion($tier1Amount, $cdiDailyPercent, $basePercent);
        $tier2Yield = $this->calculateYieldPortion($tier2Amount, $cdiDailyPercent, $aboveCapPercent);

        return $tier1Yield + $tier2Yield;
    }

    private function calculateYieldPortion(float $amount, float $cdiDailyPercent, float $cdiPercentFactor): float
    {
        if ($amount <= 0 || $cdiPercentFactor <= 0) {
            return 0.0;
        }

        $factor = $cdiPercentFactor / 100.0;
        $taxaEfetiva = $cdiDailyPercent * $factor; // % ao dia

        return $amount * ($taxaEfetiva / 100.0);
    }

    private function resolveYieldCapAmount(Account $acc): float
    {
        // prioridade: campo da conta; fallback: config fixa
        if (isset($acc->yield_cap_amount) && $acc->yield_cap_amount !== null) {
            return (float) $acc->yield_cap_amount;
        }

        return (float) config('investments.default_yield_cap_amount', 0);
    }

    private function resolveAboveCapCdiPercent(Account $acc): float
    {
        // prioridade: campo da conta; fallback: config fixa
        if (isset($acc->above_cap_cdi_percent) && $acc->above_cap_cdi_percent !== null) {
            return (float) $acc->above_cap_cdi_percent;
        }

        return (float) config('investments.default_above_cap_cdi_percent', 100);
    }

    private function buildYieldDescription(Account $acc): string
    {
        $basePercent = (float) ($acc->cdi_percent ?? 100);
        $capAmount = $this->resolveYieldCapAmount($acc);
        $aboveCapPercent = $this->resolveAboveCapCdiPercent($acc);

        $baseLabel = fmod($basePercent, 1.0) === 0.0
            ? number_format($basePercent, 0, ',', '.')
            : number_format($basePercent, 2, ',', '.');

        if ($capAmount <= 0) {
            return 'Simulação de rendimento CDI ('.$baseLabel.'%)';
        }

        $capLabel = number_format($capAmount, 2, ',', '.');

        $aboveLabel = fmod($aboveCapPercent, 1.0) === 0.0
            ? number_format($aboveCapPercent, 0, ',', '.')
            : number_format($aboveCapPercent, 2, ',', '.');

        return "Simulação de rendimento CDI (até R$ {$capLabel}: {$baseLabel}% | acima: {$aboveLabel}%)";
    }
}