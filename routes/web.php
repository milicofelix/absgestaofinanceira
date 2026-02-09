<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\AccountController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\TransferController;
use App\Http\Controllers\ReportTransactionController;
use App\Http\Controllers\TransferContactController;
use App\Http\Controllers\RecurringTransactionController;
use App\Http\Controllers\InstallmentController;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
})->name('welcome');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::resource('categories', CategoryController::class)->except(['show']);
    Route::resource('accounts', AccountController::class)->except(['show']);
    Route::resource('transactions', TransactionController::class)->except(['show']);

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

    Route::get('/reports/transactions', [ReportTransactionController::class, 'index'])->name('reports.transactions.index');
    Route::get('/reports/transactions/export', [ReportTransactionController::class, 'export'])->name('reports.transactions.export');

    Route::resource('recurrings', RecurringTransactionController::class)->except(['show']);
    Route::post('/installments', [InstallmentController::class, 'store'])->name('installments.store');
    Route::post('/installments/{installment}/cancel', [\App\Http\Controllers\InstallmentController::class, 'cancel'])
        ->name('installments.cancel');

});


Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
