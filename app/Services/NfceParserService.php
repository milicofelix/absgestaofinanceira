<?php

namespace App\Services;

use DOMDocument;
use DOMXPath;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class NfceParserService
{
    public function parseFromUrl(string $url): array
    {
        if (!$this->looksLikeNfceUrl($url)) {
            throw new \RuntimeException('A URL informada não parece ser uma consulta de NFC-e válida.');
        }

        $html = Http::timeout(20)
            ->withHeaders([
                'User-Agent' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145 Safari/537.36',
                'Accept-Language' => 'pt-BR,pt;q=0.9,en;q=0.8',
            ])
            ->get($url)
            ->throw()
            ->body();

        return $this->parseHtml($html, $url);
    }

    protected function parseHtml(string $html, string $sourceUrl): array
    {
        $dom = new DOMDocument();
        libxml_use_internal_errors(true);
        $dom->loadHTML(mb_convert_encoding($html, 'HTML-ENTITIES', 'UTF-8'));
        libxml_clear_errors();

        $xpath = new DOMXPath($dom);
        $text = $this->normalizeText($dom->textContent ?? '');

        $merchant = $this->extractMerchant($xpath, $text);
        $cnpj = $this->extractCnpj($text);
        $total = $this->extractTotal($xpath, $text);
        $payment = $this->extractPaymentMethod($text);
        $purchasedAt = $this->extractPurchasedAt($text);
        $items = $this->extractItems($xpath);

        return [
            'merchant' => $merchant,
            'merchant_short' => $this->shortMerchantName($merchant),
            'cnpj' => $cnpj,
            'total' => $total,
            'payment_method' => $this->mapPaymentMethod($payment),
            'payment_method_label' => $payment,
            'purchased_at' => $purchasedAt,
            'date' => $purchasedAt ? substr($purchasedAt, 0, 10) : now()->format('Y-m-d'),
            'items_count' => count($items),
            'items' => $items,
            'source_url' => $sourceUrl,
            'raw_summary' => [
                'merchant' => $merchant,
                'cnpj' => $cnpj,
                'total' => $total,
                'payment' => $payment,
            ],
        ];
    }

    protected function looksLikeNfceUrl(string $url): bool
    {
        $v = Str::lower($url);

        return Str::contains($v, [
            'nfce',
            'fazenda',
            'sefaz',
            'consulta',
        ]);
    }

    protected function extractMerchant(DOMXPath $xpath, string $text): ?string
    {
        $candidates = [
            "//*[contains(@class, 'txtTopo')]",
            "//*[contains(@class, 'txtCenter')]",
            "//h1",
            "//h2",
            "//strong",
            "//b",
        ];

        foreach ($candidates as $query) {
            $nodes = $xpath->query($query);
            if (!$nodes) {
                continue;
            }

            foreach ($nodes as $node) {
                $value = $this->normalizeText($node->textContent ?? '');
                if (
                    mb_strlen($value) >= 5
                    && !Str::contains(Str::lower($value), ['documento auxiliar', 'nota fiscal', 'consumidor eletrônica'])
                    && preg_match('/[A-ZÀ-Ú0-9\s\.\-\&]{6,}/u', mb_strtoupper($value))
                ) {
                    return $value;
                }
            }
        }

        if (preg_match('/([A-ZÀ-Ú0-9][A-ZÀ-Ú0-9\s\.\-\&]{8,})\s+CNPJ\s*[:]?\s*\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/u', $text, $m)) {
            return trim($m[1]);
        }

        return null;
    }

    protected function extractCnpj(string $text): ?string
    {
        if (preg_match('/\b(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\b/', $text, $m)) {
            return $m[1];
        }

        return null;
    }

    protected function extractTotal(DOMXPath $xpath, string $text): ?float
    {
        $queries = [
            "//*[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZÁÀÃÂÉÊÍÓÔÕÚÇ', 'abcdefghijklmnopqrstuvwxyzáàãâéêíóôõúç'), 'valor a pagar')]",
            "//*[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZÁÀÃÂÉÊÍÓÔÕÚÇ', 'abcdefghijklmnopqrstuvwxyzáàãâéêíóôõúç'), 'valor total')]",
        ];

        foreach ($queries as $query) {
            $nodes = $xpath->query($query);
            if (!$nodes) {
                continue;
            }

            foreach ($nodes as $node) {
                $line = $this->normalizeText($node->parentNode?->textContent ?? $node->textContent ?? '');
                $value = $this->extractMoneyFromString($line);
                if ($value !== null) {
                    return $value;
                }
            }
        }

        if (preg_match('/Valor a pagar\s*R\$\s*([\d\.,]+)/iu', $text, $m)) {
            return $this->moneyToFloat($m[1]);
        }

        return null;
    }

    protected function extractPaymentMethod(string $text): ?string
    {
        if (preg_match('/Forma de pagamento\s*:?\s*([A-Za-zÀ-Ú\sçÇ]+)\s+Valor pago/iu', $text, $m)) {
            return trim($m[1]);
        }

        foreach (['Cartão de Crédito', 'Cartão de Débito', 'PIX', 'Dinheiro'] as $label) {
            if (Str::contains(Str::lower($text), Str::lower($label))) {
                return $label;
            }
        }

        return null;
    }

    protected function extractPurchasedAt(string $text): ?string
    {
        if (preg_match('/(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2}:\d{2})/', $text, $m)) {
            [$d, $mth, $y] = explode('/', $m[1]);
            return sprintf('%04d-%02d-%02d %s', $y, $mth, $d, $m[2]);
        }

        if (preg_match('/(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})/', $text, $m)) {
            [$d, $mth, $y] = explode('/', $m[1]);
            return sprintf('%04d-%02d-%02d %s:00', $y, $mth, $d, $m[2]);
        }

        return null;
    }

    protected function extractItems(DOMXPath $xpath): array
    {
        $items = [];

        $rows = $xpath->query('//table//tr');
        if (!$rows) {
            return [];
        }

        foreach ($rows as $row) {
            $line = $this->normalizeText($row->textContent ?? '');

            if (
                mb_strlen($line) < 5
                || Str::contains(Str::lower($line), ['valor a pagar', 'forma de pagamento', 'qtd. total'])
            ) {
                continue;
            }

            if (!preg_match('/Vl\.?\s*Total|Qtd\.?|Vl\.?\s*Unit/iu', $line)) {
                continue;
            }

            $itemName = null;
            if (preg_match('/^(.+?)\s*\(C[oó]digo:/iu', $line, $m)) {
                $itemName = trim($m[1]);
            }

            $total = null;
            if (preg_match('/Vl\.?\s*Total\s*([\d\.,]+)/iu', $line, $m)) {
                $total = $this->moneyToFloat($m[1]);
            }

            $qty = null;
            if (preg_match('/Qtd\.?\s*:?\s*([\d\.,]+)/iu', $line, $m)) {
                $qty = (float) str_replace(',', '.', $m[1]);
            }

            $unit = null;
            if (preg_match('/Vl\.?\s*Unit\.?\s*:?\s*([\d\.,]+)/iu', $line, $m)) {
                $unit = $this->moneyToFloat($m[1]);
            }

            if ($itemName || $total !== null) {
                $items[] = [
                    'name' => $itemName,
                    'qty' => $qty,
                    'unit_price' => $unit,
                    'total' => $total,
                ];
            }
        }

        return array_values(array_slice($items, 0, 100));
    }

    protected function mapPaymentMethod(?string $payment): string
    {
        $value = Str::lower((string) $payment);

        if (Str::contains($value, 'crédito')) {
            return 'credit_card';
        }

        if (Str::contains($value, 'débito') || Str::contains($value, 'debito')) {
            return 'debit_card';
        }

        if (Str::contains($value, 'pix')) {
            return 'pix';
        }

        if (Str::contains($value, 'dinheiro')) {
            return 'cash';
        }

        if (Str::contains($value, 'transfer')) {
            return 'transfer';
        }

        return 'other';
    }

    protected function shortMerchantName(?string $merchant): ?string
    {
        if (!$merchant) {
            return null;
        }

        $value = trim($merchant);

        $replace = [
            ' LTDA', ' EIRELI', ' S/A', ' SA', ' ME', ' EPP',
        ];

        $value = str_ireplace($replace, '', $value);
        $value = preg_replace('/\s+/', ' ', trim($value));

        return Str::title(Str::lower($value));
    }

    protected function extractMoneyFromString(string $text): ?float
    {
        if (preg_match('/R\$\s*([\d\.,]+)/iu', $text, $m)) {
            return $this->moneyToFloat($m[1]);
        }

        return null;
    }

    protected function moneyToFloat(?string $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        $v = preg_replace('/[^\d,\.]/', '', (string) $value);
        $v = str_replace('.', '', $v);
        $v = str_replace(',', '.', $v);

        return is_numeric($v) ? round((float) $v, 2) : null;
    }

    protected function normalizeText(string $text): string
    {
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = preg_replace('/\s+/u', ' ', trim($text));
        return trim((string) $text);
    }
}