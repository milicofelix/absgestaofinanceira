<?php

namespace Tests\Feature\Transactions;

use App\Models\Account;
use App\Models\Category;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransactionStoreTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_create_transaction(): void
    {
        $user = User::factory()->create();

        $account = Account::factory()->create([
            'user_id' => $user->id,
            'type' => 'bank',
        ]);

        $category = Category::factory()->expense()->create([
            'user_id' => $user->id,
        ]);

        $payload = [
            'type' => 'expense',
            'amount' => '150.75',
            'date' => '2026-03-23',
            'description' => 'Mercado Assaí',
            'category_id' => $category->id,
            'account_id' => $account->id,
            'payment_method' => 'pix',
        ];

        $response = $this->actingAs($user)->post(route('transactions.store'), $payload);

        $response
            ->assertRedirect()
            ->assertSessionHas('success', 'Lançamento criado com sucesso!');

        $this->assertDatabaseHas('transactions', [
            'user_id' => $user->id,
            'type' => 'expense',
            'description' => 'Mercado Assaí',
            'category_id' => $category->id,
            'account_id' => $account->id,
            'payment_method' => 'pix',
        ]);

        $transaction = Transaction::query()->latest('id')->first();

        $this->assertNotNull($transaction);
        $this->assertSame('2026-03-23', $transaction->date->format('Y-m-d'));
        $this->assertSame('2026-03-23', $transaction->purchase_date?->format('Y-m-d'));
        $this->assertEquals(150.75, (float) $transaction->amount);
        $this->assertNotEmpty($transaction->idempotency_key);
        $this->assertNotEmpty($transaction->competence_month);
    }

    public function test_user_cannot_create_transaction_with_category_from_another_user(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $account = Account::factory()->create([
            'user_id' => $user->id,
            'type' => 'bank',
        ]);

        $category = Category::factory()->expense()->create([
            'user_id' => $otherUser->id,
        ]);

        $payload = [
            'type' => 'expense',
            'amount' => '99.90',
            'date' => '2026-03-23',
            'description' => 'Tentativa inválida',
            'category_id' => $category->id,
            'account_id' => $account->id,
            'payment_method' => 'pix',
        ];

        $response = $this->actingAs($user)->post(route('transactions.store'), $payload);

        $response->assertStatus(422);

        $this->assertDatabaseMissing('transactions', [
            'user_id' => $user->id,
            'description' => 'Tentativa inválida',
        ]);
    }

    public function test_user_cannot_create_transaction_with_account_from_another_user(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $account = Account::factory()->create([
            'user_id' => $otherUser->id,
            'type' => 'bank',
        ]);

        $category = Category::factory()->expense()->create([
            'user_id' => $user->id,
        ]);

        $payload = [
            'type' => 'expense',
            'amount' => '49.90',
            'date' => '2026-03-23',
            'description' => 'Conta inválida',
            'category_id' => $category->id,
            'account_id' => $account->id,
            'payment_method' => 'pix',
        ];

        $response = $this->actingAs($user)->post(route('transactions.store'), $payload);

        $response->assertStatus(422);

        $this->assertDatabaseMissing('transactions', [
            'user_id' => $user->id,
            'description' => 'Conta inválida',
        ]);
    }
}