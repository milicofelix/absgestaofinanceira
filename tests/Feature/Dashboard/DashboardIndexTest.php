<?php

namespace Tests\Feature\Dashboard;

use App\Models\Account;
use App\Models\Category;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardIndexTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_page_can_be_rendered(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('dashboard', [
            'month' => '2026-03',
        ]));

        $response->assertOk();

        $response->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard')
            ->has('filters')
            ->has('accounts')
            ->has('cardsSummary')
            ->has('income')
            ->has('expense')
            ->has('balance')
            ->has('lifetimeIncome')
            ->has('lifetimeExpense')
            ->has('latest')
            ->has('byCategory')
            ->has('budgetsBadge')
        );
    }

    public function test_dashboard_excludes_investment_accounts_from_main_balance_and_accounts_list(): void
    {
        $user = User::factory()->create();

        $bank = Account::factory()->create([
            'user_id' => $user->id,
            'name' => 'Conta Corrente',
            'type' => 'bank',
            'initial_balance' => 1000,
        ]);

        $investment = Account::factory()->create([
            'user_id' => $user->id,
            'name' => 'Tesouro',
            'type' => 'investment',
            'initial_balance' => 5000,
            'cdi_percent' => 100,
        ]);

        $incomeCategory = Category::factory()->income()->create([
            'user_id' => $user->id,
            'name' => 'Salário',
        ]);

        $expenseCategory = Category::factory()->expense()->create([
            'user_id' => $user->id,
            'name' => 'Mercado',
        ]);

        Transaction::factory()->create([
            'user_id' => $user->id,
            'account_id' => $bank->id,
            'category_id' => $incomeCategory->id,
            'type' => 'income',
            'amount' => 2000,
            'date' => '2026-03-10',
            'purchase_date' => '2026-03-10',
            'competence_month' => '2026-03',
            'is_transfer' => false,
        ]);

        Transaction::factory()->create([
            'user_id' => $user->id,
            'account_id' => $bank->id,
            'category_id' => $expenseCategory->id,
            'type' => 'expense',
            'amount' => 500,
            'date' => '2026-03-11',
            'purchase_date' => '2026-03-11',
            'competence_month' => '2026-03',
            'is_transfer' => false,
        ]);

        Transaction::factory()->create([
            'user_id' => $user->id,
            'account_id' => $investment->id,
            'category_id' => $incomeCategory->id,
            'type' => 'income',
            'amount' => 10000,
            'date' => '2026-03-12',
            'purchase_date' => '2026-03-12',
            'competence_month' => '2026-03',
            'is_transfer' => false,
        ]);

        $response = $this->actingAs($user)->get(route('dashboard', [
            'month' => '2026-03',
        ]));

        $response->assertOk();

        $response->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard')
            ->where('openingBalance', 1000)
            ->where('income', 2000)
            ->where('expense', 500)
            ->where('balance', 2500)
            ->has('accounts', 1)
            ->where('accounts.0.id', $bank->id)
            ->where('accounts.0.type', 'bank')
        );
    }

    public function test_dashboard_filters_by_account_id(): void
    {
        $user = User::factory()->create();

        $accountA = Account::factory()->create([
            'user_id' => $user->id,
            'name' => 'Conta A',
            'type' => 'bank',
            'initial_balance' => 100,
        ]);

        $accountB = Account::factory()->create([
            'user_id' => $user->id,
            'name' => 'Conta B',
            'type' => 'bank',
            'initial_balance' => 50,
        ]);

        $incomeCategory = Category::factory()->income()->create([
            'user_id' => $user->id,
            'name' => 'Salário',
        ]);

        Transaction::factory()->create([
            'user_id' => $user->id,
            'account_id' => $accountA->id,
            'category_id' => $incomeCategory->id,
            'type' => 'income',
            'amount' => 1000,
            'date' => '2026-03-10',
            'purchase_date' => '2026-03-10',
            'competence_month' => '2026-03',
            'is_transfer' => false,
        ]);

        Transaction::factory()->create([
            'user_id' => $user->id,
            'account_id' => $accountB->id,
            'category_id' => $incomeCategory->id,
            'type' => 'income',
            'amount' => 700,
            'date' => '2026-03-10',
            'purchase_date' => '2026-03-10',
            'competence_month' => '2026-03',
            'is_transfer' => false,
        ]);

        $response = $this->actingAs($user)->get(route('dashboard', [
            'month' => '2026-03',
            'account_id' => $accountA->id,
        ]));

        $response->assertOk();

        $response->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard')
            ->where('filters.account_id', (string) $accountA->id)
            ->where('income', 1000)
        );
    }

    public function test_dashboard_filters_by_search_term(): void
    {
        $user = User::factory()->create();

        $account = Account::factory()->create([
            'user_id' => $user->id,
            'type' => 'bank',
            'initial_balance' => 0,
        ]);

        $expenseCategory = Category::factory()->expense()->create([
            'user_id' => $user->id,
            'name' => 'Alimentação',
        ]);

        Transaction::factory()->create([
            'user_id' => $user->id,
            'account_id' => $account->id,
            'category_id' => $expenseCategory->id,
            'type' => 'expense',
            'amount' => 150,
            'date' => '2026-03-10',
            'purchase_date' => '2026-03-10',
            'competence_month' => '2026-03',
            'description' => 'Mercado Assaí',
            'is_transfer' => false,
        ]);

        Transaction::factory()->create([
            'user_id' => $user->id,
            'account_id' => $account->id,
            'category_id' => $expenseCategory->id,
            'type' => 'expense',
            'amount' => 90,
            'date' => '2026-03-11',
            'purchase_date' => '2026-03-11',
            'competence_month' => '2026-03',
            'description' => 'Farmácia',
            'is_transfer' => false,
        ]);

        $response = $this->actingAs($user)->get(route('dashboard', [
            'month' => '2026-03',
            'q' => 'Assaí',
        ]));

        $response->assertOk();

        $response->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard')
            ->where('expense', 150)
            ->has('latest', 1)
            ->where('latest.0.description', 'Mercado Assaí')
        );
    }

    public function test_dashboard_computes_credit_card_summary(): void
{
    $user = User::factory()->create();

    $cardA = Account::factory()->create([
        'user_id' => $user->id,
        'name' => 'Cartão A',
        'type' => 'credit_card',
        'credit_limit' => 5000,
        'initial_balance' => 0,
        'statement_close_day' => 25,
        'due_day' => 5,
    ]);

    $cardB = Account::factory()->create([
        'user_id' => $user->id,
        'name' => 'Cartão B',
        'type' => 'credit_card',
        'credit_limit' => 3000,
        'initial_balance' => 0,
        'statement_close_day' => 20,
        'due_day' => 10,
    ]);

    $expenseCategory = Category::factory()->expense()->create([
        'user_id' => $user->id,
        'name' => 'Compras Cartão',
    ]);

    $incomeCategory = Category::factory()->income()->create([
        'user_id' => $user->id,
        'name' => 'Transferência',
    ]);

    // Card A: despesas 1200, pagamento 200
    Transaction::factory()->create([
        'user_id' => $user->id,
        'account_id' => $cardA->id,
        'category_id' => $expenseCategory->id,
        'type' => 'expense',
        'amount' => 1000,
        'date' => '2026-03-10',
        'purchase_date' => '2026-03-10',
        'competence_month' => '2026-03',
        'is_transfer' => false,
    ]);

    Transaction::factory()->create([
        'user_id' => $user->id,
        'account_id' => $cardA->id,
        'category_id' => $expenseCategory->id,
        'type' => 'expense',
        'amount' => 200,
        'date' => '2026-03-12',
        'purchase_date' => '2026-03-12',
        'competence_month' => '2026-03',
        'is_transfer' => false,
    ]);

    Transaction::factory()->create([
        'user_id' => $user->id,
        'account_id' => $cardA->id,
        'category_id' => $incomeCategory->id,
        'type' => 'income',
        'amount' => 200,
        'date' => '2026-03-20',
        'purchase_date' => '2026-03-20',
        'competence_month' => '2026-03',
        'is_transfer' => true,
    ]);

    // Card B: despesas 500, sem pagamento
    Transaction::factory()->create([
        'user_id' => $user->id,
        'account_id' => $cardB->id,
        'category_id' => $expenseCategory->id,
        'type' => 'expense',
        'amount' => 500,
        'date' => '2026-03-08',
        'purchase_date' => '2026-03-08',
        'competence_month' => '2026-03',
        'is_transfer' => false,
    ]);

    // Fatura anterior do card A
    Transaction::factory()->create([
        'user_id' => $user->id,
        'account_id' => $cardA->id,
        'category_id' => $expenseCategory->id,
        'type' => 'expense',
        'amount' => 300,
        'date' => '2026-02-10',
        'purchase_date' => '2026-02-10',
        'competence_month' => '2026-02',
        'is_transfer' => false,
    ]);

    $response = $this->actingAs($user)->get(route('dashboard', [
        'month' => '2026-03',
    ]));

    $response->assertOk();

    $response->assertInertia(fn (Assert $page) => $page
        ->component('Dashboard')
        ->where('cardsSummary.total_limit', 8000)
        ->where('cardsSummary.total_used', 1800)
        ->where('cardsSummary.total_available', 6200)
        ->where('cardsSummary.total_invoice', 1700)
        ->where('cardsSummary.total_paid_invoice', 200)
        ->where('cardsSummary.total_outstanding_invoice', 1500)
        ->where('cardsSummary.total_purchase_count', 3)
        ->where('cardsSummary.total_previous_invoice', 300)
        ->where('cardsSummary.cards_count', 2)
    );
}

    public function test_dashboard_computes_budgets_badge(): void
    {
        $user = User::factory()->create();

        $account = Account::factory()->create([
            'user_id' => $user->id,
            'type' => 'bank',
            'initial_balance' => 0,
        ]);

        $food = Category::factory()->expense()->create([
            'user_id' => $user->id,
            'name' => 'Alimentação',
        ]);

        $transport = Category::factory()->expense()->create([
            'user_id' => $user->id,
            'name' => 'Transporte',
        ]);

        $health = Category::factory()->expense()->create([
            'user_id' => $user->id,
            'name' => 'Saúde',
        ]);

        \App\Models\CategoryBudget::create([
            'user_id' => $user->id,
            'category_id' => $food->id,
            'year' => 2026,
            'month' => 3,
            'amount' => 100,
        ]);

        \App\Models\CategoryBudget::create([
            'user_id' => $user->id,
            'category_id' => $transport->id,
            'year' => 2026,
            'month' => 3,
            'amount' => 100,
        ]);

        \App\Models\CategoryBudget::create([
            'user_id' => $user->id,
            'category_id' => $health->id,
            'year' => 2026,
            'month' => 3,
            'amount' => 200,
        ]);

        // warning: 90/100
        Transaction::factory()->create([
            'user_id' => $user->id,
            'account_id' => $account->id,
            'category_id' => $food->id,
            'type' => 'expense',
            'amount' => 90,
            'date' => '2026-03-10',
            'purchase_date' => '2026-03-10',
            'competence_month' => '2026-03',
            'is_transfer' => false,
        ]);

        // exceeded: 120/100
        Transaction::factory()->create([
            'user_id' => $user->id,
            'account_id' => $account->id,
            'category_id' => $transport->id,
            'type' => 'expense',
            'amount' => 120,
            'date' => '2026-03-11',
            'purchase_date' => '2026-03-11',
            'competence_month' => '2026-03',
            'is_transfer' => false,
        ]);

        // ok: 150/200
        Transaction::factory()->create([
            'user_id' => $user->id,
            'account_id' => $account->id,
            'category_id' => $health->id,
            'type' => 'expense',
            'amount' => 150,
            'date' => '2026-03-12',
            'purchase_date' => '2026-03-12',
            'competence_month' => '2026-03',
            'is_transfer' => false,
        ]);

        $response = $this->actingAs($user)->get(route('dashboard', [
            'month' => '2026-03',
        ]));

        $response->assertOk();

        //dd($response->viewData('page')['props']['budgetsBadge']);

        $response->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard')
            ->where('budgetsBadge.month', '2026-03')
            ->where('budgetsBadge.warning', 1)
            ->where('budgetsBadge.exceeded', 1)
            ->where('budgetsBadge.total', 3)
        );
    }
    // public function test_dashboard_computes_budgets_badge_warning_for_single_category(): void
    // {
    //     $user = User::factory()->create();

    //     $account = Account::factory()->create([
    //         'user_id' => $user->id,
    //         'type' => 'bank',
    //         'initial_balance' => 0,
    //     ]);

    //     $food = Category::factory()->expense()->create([
    //         'user_id' => $user->id,
    //         'name' => 'Alimentação',
    //     ]);

    //     \App\Models\CategoryBudget::create([
    //         'user_id' => $user->id,
    //         'category_id' => $food->id,
    //         'year' => 2026,
    //         'month' => 3,
    //         'amount' => 100,
    //     ]);

    //     Transaction::factory()->create([
    //         'user_id' => $user->id,
    //         'account_id' => $account->id,
    //         'category_id' => $food->id,
    //         'type' => 'expense',
    //         'amount' => 90,
    //         'date' => '2026-03-10',
    //         'purchase_date' => '2026-03-10',
    //         'competence_month' => '2026-03',
    //         'is_transfer' => false,
    //     ]);

    //     $response = $this->actingAs($user)->get(route('dashboard', [
    //         'month' => '2026-03',
    //     ]));

    //     $response->assertOk();

    //     $response->assertInertia(fn (Assert $page) => $page
    //         ->component('Dashboard')
    //         ->where('budgetsBadge.month', '2026-03')
    //         ->where('budgetsBadge.warning', 1)
    //         ->where('budgetsBadge.exceeded', 0)
    //         ->where('budgetsBadge.total', 1)
    //     );
    // }

    public function test_dashboard_monthly_budget_overrides_default_budget(): void
    {
        $user = User::factory()->create();

        $account = Account::factory()->create([
            'user_id' => $user->id,
            'type' => 'bank',
            'initial_balance' => 0,
        ]);

        $food = Category::factory()->expense()->create([
            'user_id' => $user->id,
            'name' => 'Alimentação',
        ]);

        \App\Models\CategoryBudgetDefault::create([
            'user_id' => $user->id,
            'category_id' => $food->id,
            'amount' => 100,
        ]);

        \App\Models\CategoryBudget::create([
            'user_id' => $user->id,
            'category_id' => $food->id,
            'year' => 2026,
            'month' => 3,
            'amount' => 200,
        ]);

        // Se usasse o default (100), seria exceeded.
        // Como o mensal (200) deve prevalecer, fica só 75% e não entra em warning/exceeded.
        Transaction::factory()->create([
            'user_id' => $user->id,
            'account_id' => $account->id,
            'category_id' => $food->id,
            'type' => 'expense',
            'amount' => 150,
            'date' => '2026-03-10',
            'purchase_date' => '2026-03-10',
            'competence_month' => '2026-03',
            'is_transfer' => false,
        ]);

        $response = $this->actingAs($user)->get(route('dashboard', [
            'month' => '2026-03',
        ]));

        $response->assertOk();

        $response->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard')
            ->where('budgetsBadge.month', '2026-03')
            ->where('budgetsBadge.warning', 0)
            ->where('budgetsBadge.exceeded', 0)
            ->where('budgetsBadge.total', 1)
        );
    }

    public function test_dashboard_computes_lifetime_income_and_expense_until_selected_month(): void
    {
        $user = User::factory()->create();

        $account = Account::factory()->create([
            'user_id' => $user->id,
            'type' => 'bank',
            'initial_balance' => 0,
        ]);

        $incomeCategory = Category::factory()->income()->create([
            'user_id' => $user->id,
            'name' => 'Salário',
        ]);

        $expenseCategory = Category::factory()->expense()->create([
            'user_id' => $user->id,
            'name' => 'Mercado',
        ]);

        // Janeiro
        Transaction::factory()->create([
            'user_id' => $user->id,
            'account_id' => $account->id,
            'category_id' => $incomeCategory->id,
            'type' => 'income',
            'amount' => 1000,
            'date' => '2026-01-10',
            'purchase_date' => '2026-01-10',
            'competence_month' => '2026-01',
            'is_transfer' => false,
        ]);

        Transaction::factory()->create([
            'user_id' => $user->id,
            'account_id' => $account->id,
            'category_id' => $expenseCategory->id,
            'type' => 'expense',
            'amount' => 300,
            'date' => '2026-01-15',
            'purchase_date' => '2026-01-15',
            'competence_month' => '2026-01',
            'is_transfer' => false,
        ]);

        // Fevereiro
        Transaction::factory()->create([
            'user_id' => $user->id,
            'account_id' => $account->id,
            'category_id' => $incomeCategory->id,
            'type' => 'income',
            'amount' => 1500,
            'date' => '2026-02-10',
            'purchase_date' => '2026-02-10',
            'competence_month' => '2026-02',
            'is_transfer' => false,
        ]);

        Transaction::factory()->create([
            'user_id' => $user->id,
            'account_id' => $account->id,
            'category_id' => $expenseCategory->id,
            'type' => 'expense',
            'amount' => 400,
            'date' => '2026-02-15',
            'purchase_date' => '2026-02-15',
            'competence_month' => '2026-02',
            'is_transfer' => false,
        ]);

        // Março
        Transaction::factory()->create([
            'user_id' => $user->id,
            'account_id' => $account->id,
            'category_id' => $incomeCategory->id,
            'type' => 'income',
            'amount' => 2000,
            'date' => '2026-03-10',
            'purchase_date' => '2026-03-10',
            'competence_month' => '2026-03',
            'is_transfer' => false,
        ]);

        Transaction::factory()->create([
            'user_id' => $user->id,
            'account_id' => $account->id,
            'category_id' => $expenseCategory->id,
            'type' => 'expense',
            'amount' => 500,
            'date' => '2026-03-15',
            'purchase_date' => '2026-03-15',
            'competence_month' => '2026-03',
            'is_transfer' => false,
        ]);

        // Abril (não deve entrar)
        Transaction::factory()->create([
            'user_id' => $user->id,
            'account_id' => $account->id,
            'category_id' => $incomeCategory->id,
            'type' => 'income',
            'amount' => 9999,
            'date' => '2026-04-10',
            'purchase_date' => '2026-04-10',
            'competence_month' => '2026-04',
            'is_transfer' => false,
        ]);

        $response = $this->actingAs($user)->get(route('dashboard', [
            'month' => '2026-03',
        ]));

        $response->assertOk();

        $response->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard')
            ->where('lifetimeIncome', 4500)
            ->where('lifetimeExpense', 1200)
        );
    }

    public function test_dashboard_excludes_investment_accounts_from_lifetime_totals(): void
    {
        $user = User::factory()->create();

        $bank = Account::factory()->create([
            'user_id' => $user->id,
            'type' => 'bank',
            'initial_balance' => 0,
        ]);

        $investment = Account::factory()->create([
            'user_id' => $user->id,
            'type' => 'investment',
            'initial_balance' => 0,
            'cdi_percent' => 100,
        ]);

        $incomeCategory = Category::factory()->income()->create([
            'user_id' => $user->id,
            'name' => 'Receita',
        ]);

        $expenseCategory = Category::factory()->expense()->create([
            'user_id' => $user->id,
            'name' => 'Despesa',
        ]);

        // Conta normal
        Transaction::factory()->create([
            'user_id' => $user->id,
            'account_id' => $bank->id,
            'category_id' => $incomeCategory->id,
            'type' => 'income',
            'amount' => 1000,
            'date' => '2026-03-10',
            'purchase_date' => '2026-03-10',
            'competence_month' => '2026-03',
            'is_transfer' => false,
        ]);

        Transaction::factory()->create([
            'user_id' => $user->id,
            'account_id' => $bank->id,
            'category_id' => $expenseCategory->id,
            'type' => 'expense',
            'amount' => 200,
            'date' => '2026-03-11',
            'purchase_date' => '2026-03-11',
            'competence_month' => '2026-03',
            'is_transfer' => false,
        ]);

        // Investimento — não deve entrar
        Transaction::factory()->create([
            'user_id' => $user->id,
            'account_id' => $investment->id,
            'category_id' => $incomeCategory->id,
            'type' => 'income',
            'amount' => 5000,
            'date' => '2026-03-12',
            'purchase_date' => '2026-03-12',
            'competence_month' => '2026-03',
            'is_transfer' => false,
        ]);

        Transaction::factory()->create([
            'user_id' => $user->id,
            'account_id' => $investment->id,
            'category_id' => $expenseCategory->id,
            'type' => 'expense',
            'amount' => 1000,
            'date' => '2026-03-13',
            'purchase_date' => '2026-03-13',
            'competence_month' => '2026-03',
            'is_transfer' => false,
        ]);

        $response = $this->actingAs($user)->get(route('dashboard', [
            'month' => '2026-03',
        ]));

        $response->assertOk();

        $response->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard')
            ->where('lifetimeIncome', 1000)
            ->where('lifetimeExpense', 200)
        );
    }

    public function test_dashboard_lifetime_totals_respect_account_filter(): void
    {
        $user = User::factory()->create();

        $accountA = Account::factory()->create([
            'user_id' => $user->id,
            'type' => 'bank',
            'name' => 'Conta A',
            'initial_balance' => 0,
        ]);

        $accountB = Account::factory()->create([
            'user_id' => $user->id,
            'type' => 'bank',
            'name' => 'Conta B',
            'initial_balance' => 0,
        ]);

        $incomeCategory = Category::factory()->income()->create([
            'user_id' => $user->id,
            'name' => 'Receita',
        ]);

        $expenseCategory = Category::factory()->expense()->create([
            'user_id' => $user->id,
            'name' => 'Despesa',
        ]);

        Transaction::factory()->create([
            'user_id' => $user->id,
            'account_id' => $accountA->id,
            'category_id' => $incomeCategory->id,
            'type' => 'income',
            'amount' => 1000,
            'date' => '2026-02-10',
            'purchase_date' => '2026-02-10',
            'competence_month' => '2026-02',
            'is_transfer' => false,
        ]);

        Transaction::factory()->create([
            'user_id' => $user->id,
            'account_id' => $accountA->id,
            'category_id' => $expenseCategory->id,
            'type' => 'expense',
            'amount' => 300,
            'date' => '2026-02-11',
            'purchase_date' => '2026-02-11',
            'competence_month' => '2026-02',
            'is_transfer' => false,
        ]);

        Transaction::factory()->create([
            'user_id' => $user->id,
            'account_id' => $accountB->id,
            'category_id' => $incomeCategory->id,
            'type' => 'income',
            'amount' => 2000,
            'date' => '2026-03-10',
            'purchase_date' => '2026-03-10',
            'competence_month' => '2026-03',
            'is_transfer' => false,
        ]);

        Transaction::factory()->create([
            'user_id' => $user->id,
            'account_id' => $accountB->id,
            'category_id' => $expenseCategory->id,
            'type' => 'expense',
            'amount' => 400,
            'date' => '2026-03-11',
            'purchase_date' => '2026-03-11',
            'competence_month' => '2026-03',
            'is_transfer' => false,
        ]);

        $response = $this->actingAs($user)->get(route('dashboard', [
            'month' => '2026-03',
            'account_id' => $accountA->id,
        ]));

        $response->assertOk();

        $response->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard')
            ->where('lifetimeIncome', 1000)
            ->where('lifetimeExpense', 300)
        );
    }
}