<?php

namespace App\Services\Transactions;

class IdempotencyKeyService
{
    public static function build(
        int $userId,
        int $accountId,
        string $type,
        string $purchaseDateYmd,
        mixed $amount,
        ?string $description
    ): string {
        $desc = self::normalizeDesc($description); //$this->normalizeDesc($description);
        $cents = self::amountToCents($amount); //$this->amountToCents($amount);

        $raw = "{$userId}|{$accountId}|{$type}|{$purchaseDateYmd}|{$cents}|{$desc}";

        return substr(hash('sha256', $raw), 0, 64);
    }

    private static function normalizeDesc(?string $s): string
    {
        $s = (string)($s ?? '');
        $s = mb_strtolower($s);
        $s = preg_replace('/\s+/', ' ', trim($s));
        $s = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s) ?: $s;
        $s = preg_replace('/[^a-z0-9 \-_.]/', '', $s);
        $s = preg_replace('/\s+/', ' ', trim($s));

        return trim($s);
    }

    private static function amountToCents(mixed $amount): int
    {
        return (int) round(((float) $amount) * 100);
    }
}