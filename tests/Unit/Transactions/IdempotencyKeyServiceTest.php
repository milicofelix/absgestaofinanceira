<?php

namespace Tests\Unit\Transactions;

use App\Services\Transactions\IdempotencyKeyService;
use Tests\TestCase;

class IdempotencyKeyServiceTest extends TestCase
{
    public function test_build_returns_same_key_for_same_input(): void
    {
        $service = new IdempotencyKeyService();

        $keyA = $service->build(1, 10, 'expense', '2026-03-23', '150.75', 'Mercado Assaí');
        $keyB = $service->build(1, 10, 'expense', '2026-03-23', '150.75', 'Mercado Assaí');

        $this->assertSame($keyA, $keyB);
    }

    public function test_build_returns_different_key_when_account_changes(): void
    {
        $service = new IdempotencyKeyService();

        $keyA = $service->build(1, 10, 'expense', '2026-03-23', '150.75', 'Mercado Assaí');
        $keyB = $service->build(1, 11, 'expense', '2026-03-23', '150.75', 'Mercado Assaí');

        $this->assertNotSame($keyA, $keyB);
    }

    public function test_build_returns_different_key_when_type_changes(): void
    {
        $service = new IdempotencyKeyService();

        $keyA = $service->build(1, 10, 'expense', '2026-03-23', '150.75', 'Mercado Assaí');
        $keyB = $service->build(1, 10, 'income', '2026-03-23', '150.75', 'Mercado Assaí');

        $this->assertNotSame($keyA, $keyB);
    }

    public function test_build_returns_different_key_when_purchase_date_changes(): void
    {
        $service = new IdempotencyKeyService();

        $keyA = $service->build(1, 10, 'expense', '2026-03-23', '150.75', 'Mercado Assaí');
        $keyB = $service->build(1, 10, 'expense', '2026-03-24', '150.75', 'Mercado Assaí');

        $this->assertNotSame($keyA, $keyB);
    }

    public function test_build_returns_different_key_when_amount_changes(): void
    {
        $service = new IdempotencyKeyService();

        $keyA = $service->build(1, 10, 'expense', '2026-03-23', '150.75', 'Mercado Assaí');
        $keyB = $service->build(1, 10, 'expense', '2026-03-23', '150.76', 'Mercado Assaí');

        $this->assertNotSame($keyA, $keyB);
    }

    public function test_build_returns_same_key_for_descriptions_that_normalize_to_same_value(): void
    {
        $service = new IdempotencyKeyService();

        $keyA = $service->build(1, 10, 'expense', '2026-03-23', '150.75', 'Mercado Assaí');
        $keyB = $service->build(1, 10, 'expense', '2026-03-23', '150.75', '  mercado   assai  ');

        $this->assertSame($keyA, $keyB);
    }

    public function test_build_removes_accents_and_noisy_characters_from_description(): void
    {
        $service = new IdempotencyKeyService();

        $keyA = $service->build(1, 10, 'expense', '2026-03-23', '150.75', 'Pagamento João @ Loja!');
        $keyB = $service->build(1, 10, 'expense', '2026-03-23', '150.75', 'pagamento joao loja');

        $this->assertSame($keyA, $keyB);
    }

    public function test_build_treats_null_and_blank_description_equivalently(): void
    {
        $service = new IdempotencyKeyService();

        $keyA = $service->build(1, 10, 'expense', '2026-03-23', '150.75', null);
        $keyB = $service->build(1, 10, 'expense', '2026-03-23', '150.75', '   ');

        $this->assertSame($keyA, $keyB);
    }

    public function test_build_returns_64_char_hash(): void
    {
        $service = new IdempotencyKeyService();

        $key = $service->build(1, 10, 'expense', '2026-03-23', '150.75', 'Mercado Assaí');

        $this->assertSame(64, strlen($key));
    }

    public function test_build_handles_float_amount_consistently(): void
    {
        $service = new IdempotencyKeyService();

        $keyA = $service->build(1, 10, 'expense', '2026-03-23', 150.75, 'Mercado Assaí');
        $keyB = $service->build(1, 10, 'expense', '2026-03-23', '150.75', 'Mercado Assaí');

        $this->assertSame($keyA, $keyB);
    }
}