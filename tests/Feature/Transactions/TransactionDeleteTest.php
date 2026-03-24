<?php

namespace Tests\Feature\Transactions;

use App\Models\Account;
use App\Models\Category;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransactionDeleteTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_delete_own_transaction(): void
    {
        $user = User::factory()->create();

        $account = Account::factory()->create([
            'user_id' => $user->id,
            'type' => 'bank',
        ]);

        $category = Category::factory()->expense()->create([
            'user_id' => $user->id,
        ]);

        $transaction = Transaction::factory()->create([
            'user_id' => $user->id,
            'category_id' => $category->id,
            'account_id' => $account->id,
            'competence_month' => '2026-03',
        ]);

        $response = $this->actingAs($user)->delete(route('transactions.destroy', $transaction));

        $response
            ->assertRedirect()
            ->assertSessionHas('success', 'Transação excluida.');

        $this->assertDatabaseMissing('transactions', [
            'id' => $transaction->id,
        ]);
    }

    public function test_user_cannot_delete_transaction_from_another_user(): void
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

        $this->actingAs($user)
            ->delete(route('transactions.destroy', $transaction))
            ->assertForbidden();

        $this->assertDatabaseHas('transactions', [
            'id' => $transaction->id,
        ]);
    }

    public function test_delete_redirect_preserves_query_params(): void
    {
        $user = User::factory()->create();

        $account = Account::factory()->create([
            'user_id' => $user->id,
            'type' => 'bank',
        ]);

        $category = Category::factory()->expense()->create([
            'user_id' => $user->id,
        ]);

        $transaction = Transaction::factory()->create([
            'user_id' => $user->id,
            'category_id' => $category->id,
            'account_id' => $account->id,
            'competence_month' => '2026-03',
        ]);

        $response = $this->actingAs($user)->delete(
            route('transactions.destroy', [
                'transaction' => $transaction->id,
                'month' => '2026-05',
                'type' => 'expense',
                'account_id' => $account->id,
                'q' => 'mercado',
                'status' => 'open',
            ])
        );

        $response->assertRedirect(
            route('transactions.index', [
                'month' => '2026-05',
                'type' => 'expense',
                'account_id' => $account->id,
                'q' => 'mercado',
                'status' => 'open',
            ])
        );
    }
}