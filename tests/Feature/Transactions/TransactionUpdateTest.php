<?php

namespace Tests\Feature\Transactions;

use App\Models\Account;
use App\Models\Category;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransactionUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_update_own_transaction(): void
    {
        $user = User::factory()->create();

        $oldAccount = Account::factory()->create([
            'user_id' => $user->id,
            'type' => 'bank',
        ]);

        $newAccount = Account::factory()->create([
            'user_id' => $user->id,
            'type' => 'bank',
        ]);

        $oldCategory = Category::factory()->expense()->create([
            'user_id' => $user->id,
        ]);

        $newCategory = Category::factory()->expense()->create([
            'user_id' => $user->id,
        ]);

        $transaction = Transaction::factory()->create([
            'user_id' => $user->id,
            'type' => 'expense',
            'amount' => 120.00,
            'date' => '2026-03-10',
            'purchase_date' => '2026-03-10',
            'description' => 'Compra antiga',
            'category_id' => $oldCategory->id,
            'account_id' => $oldAccount->id,
            'payment_method' => 'pix',
            'installment_id' => null,
            'competence_month' => '2026-03',
        ]);

        $payload = [
            'type' => 'expense',
            'amount' => '199.90',
            'date' => '2026-03-23',
            'description' => 'Compra atualizada',
            'category_id' => $newCategory->id,
            'account_id' => $newAccount->id,
            'payment_method' => 'debit_card',
            'is_cleared' => true,
        ];

        $response = $this->actingAs($user)->put(route('transactions.update', $transaction), $payload);

        $response
            ->assertRedirect()
            ->assertSessionHas('success', 'Transação atualizada.');

        $transaction->refresh();

        $this->assertSame('expense', $transaction->type);
        $this->assertEquals(199.90, (float) $transaction->amount);
        $this->assertSame('2026-03-23', $transaction->date->format('Y-m-d'));
        $this->assertSame('2026-03-23', $transaction->purchase_date?->format('Y-m-d'));
        $this->assertSame('Compra atualizada', $transaction->description);
        $this->assertSame($newCategory->id, $transaction->category_id);
        $this->assertSame($newAccount->id, $transaction->account_id);
        $this->assertSame('debit_card', $transaction->payment_method);
        $this->assertTrue((bool) $transaction->is_cleared);
        $this->assertNotEmpty($transaction->idempotency_key);
        $this->assertNotEmpty($transaction->competence_month);
    }

    public function test_user_cannot_update_transaction_from_another_user(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $account = Account::factory()->create([
            'user_id' => $otherUser->id,
            'type' => 'bank',
        ]);

        $category = Category::factory()->expense()->create([
            'user_id' => $otherUser->id,
        ]);

        $transaction = Transaction::factory()->create([
            'user_id' => $otherUser->id,
            'category_id' => $category->id,
            'account_id' => $account->id,
        ]);

        $payload = [
            'type' => 'expense',
            'amount' => '250.00',
            'date' => '2026-03-23',
            'description' => 'Tentativa inválida',
            'category_id' => $category->id,
            'account_id' => $account->id,
            'payment_method' => 'pix',
            'is_cleared' => false,
        ];

        $this->actingAs($user)
            ->put(route('transactions.update', $transaction), $payload)
            ->assertForbidden();
    }

    public function test_user_cannot_update_transaction_with_category_from_another_user(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $account = Account::factory()->create([
            'user_id' => $user->id,
            'type' => 'bank',
        ]);

        $ownCategory = Category::factory()->expense()->create([
            'user_id' => $user->id,
        ]);

        $foreignCategory = Category::factory()->expense()->create([
            'user_id' => $otherUser->id,
        ]);

        $transaction = Transaction::factory()->create([
            'user_id' => $user->id,
            'category_id' => $ownCategory->id,
            'account_id' => $account->id,
            'description' => 'Original',
        ]);

        $payload = [
            'type' => 'expense',
            'amount' => '88.00',
            'date' => '2026-03-23',
            'description' => 'Não deveria atualizar',
            'category_id' => $foreignCategory->id,
            'account_id' => $account->id,
            'payment_method' => 'pix',
            'is_cleared' => false,
        ];

        $this->actingAs($user)
            ->put(route('transactions.update', $transaction), $payload)
            ->assertStatus(422);

        $transaction->refresh();

        $this->assertSame('Original', $transaction->description);
        $this->assertSame($ownCategory->id, $transaction->category_id);
    }

    public function test_user_cannot_update_transaction_with_account_from_another_user(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $ownAccount = Account::factory()->create([
            'user_id' => $user->id,
            'type' => 'bank',
        ]);

        $foreignAccount = Account::factory()->create([
            'user_id' => $otherUser->id,
            'type' => 'bank',
        ]);

        $category = Category::factory()->expense()->create([
            'user_id' => $user->id,
        ]);

        $transaction = Transaction::factory()->create([
            'user_id' => $user->id,
            'category_id' => $category->id,
            'account_id' => $ownAccount->id,
            'description' => 'Original',
        ]);

        $payload = [
            'type' => 'expense',
            'amount' => '77.00',
            'date' => '2026-03-23',
            'description' => 'Não deveria atualizar',
            'category_id' => $category->id,
            'account_id' => $foreignAccount->id,
            'payment_method' => 'pix',
            'is_cleared' => false,
        ];

        $this->actingAs($user)
            ->put(route('transactions.update', $transaction), $payload)
            ->assertStatus(422);

        $transaction->refresh();

        $this->assertSame('Original', $transaction->description);
        $this->assertSame($ownAccount->id, $transaction->account_id);
    }

    public function test_update_keeps_purchase_date_for_installment_transaction(): void
    {
        $user = User::factory()->create();

        $account = Account::factory()->create([
            'user_id' => $user->id,
            'type' => 'credit_card',
            'statement_close_day' => 25,
            'due_day' => 5,
        ]);

        $category = Category::factory()->expense()->create([
            'user_id' => $user->id,
        ]);

        $installment = \App\Models\Installment::factory()->create([
            'user_id' => $user->id,
            'account_id' => $account->id,
            'category_id' => $category->id,
            'description' => 'Compra parcelada teste',
            'total_amount' => 300.00,
            'installments_count' => 3,
            'first_due_date' => '2026-03-02',
            'is_active' => true,
        ]);

        $transaction = Transaction::factory()->create([
            'user_id' => $user->id,
            'category_id' => $category->id,
            'account_id' => $account->id,
            'date' => '2026-04-10',
            'purchase_date' => '2026-03-02',
            'installment_id' => $installment->id,
            'competence_month' => '2026-04',
        ]);

        $payload = [
            'type' => 'expense',
            'amount' => '50.00',
            'date' => '2026-04-20',
            'description' => 'Parcela editada',
            'category_id' => $category->id,
            'account_id' => $account->id,
            'payment_method' => 'credit_card',
            'is_cleared' => false,
        ];

        $this->actingAs($user)
            ->put(route('transactions.update', $transaction), $payload)
            ->assertRedirect();

        $transaction->refresh();

        $this->assertSame('2026-04-20', $transaction->date->format('Y-m-d'));
        $this->assertSame('2026-03-02', $transaction->purchase_date?->format('Y-m-d'));
    }
}