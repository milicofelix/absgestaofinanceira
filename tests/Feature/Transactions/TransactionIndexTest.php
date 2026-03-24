<?php

namespace Tests\Feature\Transactions;

use App\Models\Account;
use App\Models\Category;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TransactionIndexTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_sees_only_own_transactions(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $account = Account::factory()->create([
            'user_id' => $user->id,
            'type' => 'bank',
        ]);

        $category = Category::factory()->expense()->create([
            'user_id' => $user->id,
        ]);

        $otherAccount = Account::factory()->create([
            'user_id' => $otherUser->id,
            'type' => 'bank',
        ]);

        $otherCategory = Category::factory()->expense()->create([
            'user_id' => $otherUser->id,
        ]);

        $ownTransaction = Transaction::factory()->create([
            'user_id' => $user->id,
            'account_id' => $account->id,
            'category_id' => $category->id,
            'description' => 'Transação do Adriano',
            'date' => '2026-03-10',
            'purchase_date' => '2026-03-10',
            'competence_month' => '2026-03',
        ]);

        Transaction::factory()->create([
            'user_id' => $otherUser->id,
            'account_id' => $otherAccount->id,
            'category_id' => $otherCategory->id,
            'description' => 'Transação de outro usuário',
            'date' => '2026-03-10',
            'purchase_date' => '2026-03-10',
            'competence_month' => '2026-03',
        ]);

        $response = $this->actingAs($user)->get(route('transactions.index', [
            'month' => '2026-03',
        ]));

        $response->assertOk();

        $response->assertInertia(fn (Assert $page) => $page
            ->component('Transactions/Index')
            ->has('transactions.data', 1)
            ->where('transactions.data.0.id', $ownTransaction->id)
            ->where('transactions.data.0.description', 'Transação do Adriano')
        );
    }

    public function test_index_filters_transactions_by_month(): void
    {
        $user = User::factory()->create();

        $account = Account::factory()->create([
            'user_id' => $user->id,
            'type' => 'bank',
        ]);

        $category = Category::factory()->expense()->create([
            'user_id' => $user->id,
        ]);

        $march = Transaction::factory()->create([
            'user_id' => $user->id,
            'account_id' => $account->id,
            'category_id' => $category->id,
            'description' => 'Março',
            'date' => '2026-03-15',
            'purchase_date' => '2026-03-15',
            'competence_month' => '2026-03',
        ]);

        Transaction::factory()->create([
            'user_id' => $user->id,
            'account_id' => $account->id,
            'category_id' => $category->id,
            'description' => 'Abril',
            'date' => '2026-04-15',
            'purchase_date' => '2026-04-15',
            'competence_month' => '2026-04',
        ]);

        $response = $this->actingAs($user)->get(route('transactions.index', [
            'month' => '2026-03',
        ]));

        $response->assertOk();

        $response->assertInertia(fn (Assert $page) => $page
            ->component('Transactions/Index')
            ->has('transactions.data', 1)
            ->where('transactions.data.0.id', $march->id)
            ->where('transactions.data.0.description', 'Março')
        );
    }

    public function test_index_filters_transactions_by_account(): void
    {
        $user = User::factory()->create();

        $accountA = Account::factory()->create([
            'user_id' => $user->id,
            'name' => 'Conta A',
            'type' => 'bank',
        ]);

        $accountB = Account::factory()->create([
            'user_id' => $user->id,
            'name' => 'Conta B',
            'type' => 'bank',
        ]);

        $category = Category::factory()->expense()->create([
            'user_id' => $user->id,
        ]);

        $expected = Transaction::factory()->create([
            'user_id' => $user->id,
            'account_id' => $accountA->id,
            'category_id' => $category->id,
            'description' => 'Da conta A',
            'date' => '2026-03-15',
            'purchase_date' => '2026-03-15',
            'competence_month' => '2026-03',
        ]);

        Transaction::factory()->create([
            'user_id' => $user->id,
            'account_id' => $accountB->id,
            'category_id' => $category->id,
            'description' => 'Da conta B',
            'date' => '2026-03-15',
            'purchase_date' => '2026-03-15',
            'competence_month' => '2026-03',
        ]);

        $response = $this->actingAs($user)->get(route('transactions.index', [
            'month' => '2026-03',
            'account_id' => $accountA->id,
        ]));

        $response->assertOk();

        $response->assertInertia(fn (Assert $page) => $page
            ->component('Transactions/Index')
            ->has('transactions.data', 1)
            ->where('transactions.data.0.id', $expected->id)
            ->where('transactions.data.0.description', 'Da conta A')
        );
    }

    public function test_index_filters_transactions_by_category(): void
    {
        $user = User::factory()->create();

        $account = Account::factory()->create([
            'user_id' => $user->id,
            'type' => 'bank',
        ]);

        $food = Category::factory()->expense()->create([
            'user_id' => $user->id,
            'name' => 'Alimentação',
        ]);

        $transport = Category::factory()->expense()->create([
            'user_id' => $user->id,
            'name' => 'Transporte',
        ]);

        $expected = Transaction::factory()->create([
            'user_id' => $user->id,
            'account_id' => $account->id,
            'category_id' => $food->id,
            'description' => 'Mercado',
            'date' => '2026-03-15',
            'purchase_date' => '2026-03-15',
            'competence_month' => '2026-03',
        ]);

        Transaction::factory()->create([
            'user_id' => $user->id,
            'account_id' => $account->id,
            'category_id' => $transport->id,
            'description' => 'Uber',
            'date' => '2026-03-15',
            'purchase_date' => '2026-03-15',
            'competence_month' => '2026-03',
        ]);

        $response = $this->actingAs($user)->get(route('transactions.index', [
            'month' => '2026-03',
            'category_id' => $food->id,
        ]));

        $response->assertOk();

        $response->assertInertia(fn (Assert $page) => $page
            ->component('Transactions/Index')
            ->has('transactions.data', 1)
            ->where('transactions.data.0.id', $expected->id)
            ->where('transactions.data.0.description', 'Mercado')
        );
    }

    public function test_index_filters_transactions_by_search_term(): void
    {
        $user = User::factory()->create();

        $account = Account::factory()->create([
            'user_id' => $user->id,
            'type' => 'bank',
        ]);

        $category = Category::factory()->expense()->create([
            'user_id' => $user->id,
        ]);

        $expected = Transaction::factory()->create([
            'user_id' => $user->id,
            'account_id' => $account->id,
            'category_id' => $category->id,
            'description' => 'Mercado Assaí',
            'date' => '2026-03-15',
            'purchase_date' => '2026-03-15',
            'competence_month' => '2026-03',
        ]);

        Transaction::factory()->create([
            'user_id' => $user->id,
            'account_id' => $account->id,
            'category_id' => $category->id,
            'description' => 'Farmácia',
            'date' => '2026-03-15',
            'purchase_date' => '2026-03-15',
            'competence_month' => '2026-03',
        ]);

        $response = $this->actingAs($user)->get(route('transactions.index', [
            'month' => '2026-03',
            'q' => 'Assaí',
        ]));

        $response->assertOk();

        $response->assertInertia(fn (Assert $page) => $page
            ->component('Transactions/Index')
            ->has('transactions.data', 1)
            ->where('transactions.data.0.id', $expected->id)
            ->where('transactions.data.0.description', 'Mercado Assaí')
        );
    }
}