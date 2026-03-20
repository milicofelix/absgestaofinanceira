<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class NfceController extends Controller
{
    public function parse(Request $request)
    {
        $data = $request->validate([
            'url' => ['required', 'url'],
        ]);

        $response = Http::timeout(20)
            ->withHeaders([
                'User-Agent' => 'Mozilla/5.0',
                'Accept-Language' => 'pt-BR,pt;q=0.9,en;q=0.8',
            ])
            ->get($data['url']);

        if (!$response->ok()) {
            return response()->json([
                'message' => 'Não foi possível consultar a NFC-e.',
            ], 422);
        }

        $html = $response->body();

        $parsed = $this->parseNfceHtml($html);

        return response()->json($parsed);
    }

    private function parseNfceHtml(string $html): array
    {
        $text = html_entity_decode($html, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        // remove scripts e styles antes de strip_tags
        $text = preg_replace('/<script\b[^>]*>.*?<\/script>/is', ' ', $text);
        $text = preg_replace('/<style\b[^>]*>.*?<\/style>/is', ' ', $text);

        $text = strip_tags($text);
        $text = preg_replace('/[ \t]+/u', ' ', $text);
        $text = preg_replace('/\r\n|\r/u', "\n", $text);
        $text = preg_replace("/\n{2,}/u", "\n", $text);
        $text = trim($text);

        return [
            'merchant_name' => $this->extractMerchantNameFromText($text),
            'date' => $this->extractIssueDateFromText($text),
            'total' => $this->extractTotalFromText($text),
            'payment_method' => $this->extractPaymentMethodFromText($text),
        ];
    }

    private function extractIssueDateFromText(string $text): ?string
    {
        // Ex.: Emissão: 19/03/2026 15:03:02 - Via Consumidor
        if (preg_match('/Emiss[aã]o:\s*([0-9]{2}\/[0-9]{2}\/[0-9]{4})\s+([0-9]{2}:[0-9]{2}:[0-9]{2})/iu', $text, $m)) {
            return trim($m[1] . ' ' . $m[2]);
        }

        return null;
    }

    private function extractTotalFromText(string $text): ?float
    {
        // Ex.: Valor a pagar R$:41,65
        if (preg_match('/Valor a pagar R\$\s*:?\s*([0-9\.,]+)/iu', $text, $m)) {
            return $this->toMoney($m[1]);
        }

        return null;
    }

    private function extractPaymentMethodFromText(string $text): ?string
    {
        // tenta pegar só o nome do meio de pagamento
        if (preg_match('/Forma de pagamento.*?(Cart[aã]o de Cr[eé]dito|Cart[aã]o de D[eé]bito|Pix|Dinheiro|Vale Alimenta[cç][aã]o|Vale Refei[cç][aã]o)/isu', $text, $m)) {
            return trim($m[1]);
        }

        // fallback: às vezes vem sem o rótulo limpo
        if (preg_match('/(Cart[aã]o de Cr[eé]dito|Cart[aã]o de D[eé]bito|Pix|Dinheiro)/iu', $text, $m)) {
            return trim($m[1]);
        }

        return null;
    }

    private function toMoney(?string $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        $value = preg_replace('/[^\d,.-]/', '', $value);

        if (str_contains($value, ',') && str_contains($value, '.')) {
            $value = str_replace('.', '', $value);
            $value = str_replace(',', '.', $value);
        } elseif (str_contains($value, ',')) {
            $value = str_replace(',', '.', $value);
        }

        return is_numeric($value) ? round((float) $value, 2) : null;
    }

    private function extractMerchantNameFromText(string $text): ?string
    {
        // Ex.:
        // DOCUMENTO AUXILIAR DA NOTA FISCAL DE CONSUMIDOR ELETRÔNICA
        // SUPERMERCADO VILA NOVA CURUCA LTDA
        // CNPJ: 11.646.469/0001-19

        if (preg_match('/DOCUMENTO AUXILIAR DA NOTA FISCAL DE CONSUMIDOR ELETRÔNICA\s+(.+?)\s+CNPJ\s*:/isu', $text, $m)) {
            return $this->cleanText($m[1]);
        }

        // fallback: pega a linha antes do CNPJ
        if (preg_match('/([A-Z0-9ÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ\.\-\/\&\s]{5,})\s+CNPJ\s*:/u', $text, $m)) {
            return $this->cleanText($m[1]);
        }

        return null;
    }

    private function cleanText(?string $value): ?string
    {
        $value = trim(html_entity_decode(strip_tags((string) $value)));
        $value = preg_replace('/\s+/u', ' ', $value);
        return $value !== '' ? $value : null;
    }
}