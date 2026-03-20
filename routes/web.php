<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\AccountController;
use App\Http\Controllers\Auth\SocialiteController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\TransferController;
use App\Http\Controllers\ReportTransactionController;
use App\Http\Controllers\TransferContactController;
use App\Http\Controllers\RecurringTransactionController;
use App\Http\Controllers\InstallmentController;
use App\Http\Controllers\CategoryBudgetController;
use App\Http\Controllers\CategoryBudgetDefaultController;
use App\Http\Controllers\ThemeSettingsController;
use App\Http\Controllers\CreditCardInvoiceController;
use App\Http\Controllers\InvestmentController;
use App\Http\Controllers\NfceController;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
})->name('welcome');

Route::get('auth/google', [SocialiteController::class, 'redirectToGoogle'])
    ->name('auth.google.redirect');

Route::get('auth/google/callback', [SocialiteController::class, 'handleGoogleCallback'])
    ->name('auth.google.callback');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::resource('categories', CategoryController::class)->except(['show']);
    Route::resource('accounts', AccountController::class)->except(['show']);
    Route::resource('transactions', TransactionController::class)->except(['show']);
    Route::post('/transactions/{transaction}/mark-paid', [TransactionController::class, 'markPaid'])->name('transactions.markPaid');
    Route::get('/transactions/{transaction}', [TransactionController::class, 'show'])->name('transactions.show');
    Route::get('/transactions/suggestions/descriptions', [TransactionController::class, 'descriptionSuggestions'])
        ->name('transactions.suggestions.descriptions');

    // Transferências
    Route::get('/transfers/create', [TransferController::class, 'create'])->name('transfers.create');
    Route::post('/transfers', [TransferController::class, 'store'])->name('transfers.store');
    // 🔎 buscar contas do destinatário (somente contatos permitidos)
    Route::get('/transfers/recipient-accounts', [TransferController::class, 'recipientAccounts'])->name('transfers.recipientAccounts');
    Route::get('/transfers/recipients', [TransferController::class, 'recipientSearch'])
        ->name('transfers.recipientSearch');

    // Contatos
    Route::get('/transfer-contacts', [TransferContactController::class, 'index'])->name('transfer_contacts.index');
    Route::post('/transfer-contacts', [TransferContactController::class, 'store'])->name('transfer_contacts.store');
    Route::delete('/transfer-contacts/{contactUserId}', [TransferContactController::class, 'destroy'])->name('transfer_contacts.destroy');
    Route::get('/transfer-contacts/users', [TransferContactController::class, 'userSearch'])
        ->name('transfer_contacts.userSearch'); // busca users por email p/ adicionar contato

    // Relatórios
    Route::get('/reports/transactions', [ReportTransactionController::class, 'index'])->name('reports.transactions.index');
    Route::get('/reports/transactions/export', [ReportTransactionController::class, 'export'])->name('reports.transactions.export');

    // Recorrentes
    Route::resource('recurrings', RecurringTransactionController::class)->except(['show']);
    Route::post('/installments', [InstallmentController::class, 'store'])->name('installments.store');
    Route::post('/installments/{installment}/cancel', [\App\Http\Controllers\InstallmentController::class, 'cancel'])
        ->name('installments.cancel');

    // Orçamentos
    Route::get('/budgets', [CategoryBudgetController::class, 'index'])->name('budgets.index');
    Route::post('/budgets', [CategoryBudgetController::class, 'store'])->name('budgets.store');
    Route::put('/budgets/{budget}', [CategoryBudgetController::class, 'update'])->name('budgets.update');
    Route::delete('/budgets/{budget}', [CategoryBudgetController::class, 'destroy'])->name('budgets.destroy');

    // Orçamentos padrão
    Route::post('/budget-defaults', [CategoryBudgetDefaultController::class, 'store'])->name('budget-defaults.store');
    Route::put('/budget-defaults/{budgetDefault}', [CategoryBudgetDefaultController::class, 'update'])->name('budget-defaults.update');
    Route::delete('/budget-defaults/{budgetDefault}', [CategoryBudgetDefaultController::class, 'destroy'])->name('budget-defaults.destroy');

    // Configurações
    Route::get('/settings/theme', [ThemeSettingsController::class, 'edit'])->name('settings.theme.edit');
    Route::put('/settings/theme', [ThemeSettingsController::class, 'update'])->name('settings.theme.update');

    // Cartão de crédito - pagamento e antecipação de faturas
    Route::post('/credit-cards/{account}/advance-invoice', [CreditCardInvoiceController::class, 'advance'])
    ->name('credit-cards.advance-invoice');
    Route::post('/credit-cards/{account}/pay-invoice', [CreditCardInvoiceController::class, 'pay'])
        ->name('credit-cards.pay-invoice');

    Route::get('/investments', [InvestmentController::class, 'index'])
        ->name('investments.index');

    Route::get('/investments/{account}', [InvestmentController::class, 'show'])
        ->name('investments.show');

    Route::post('/nfce/parse', [NfceController::class, 'parse'])
        ->name('nfce.parse');

});

// Perfil
Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
