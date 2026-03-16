<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('credit_card_invoice_advances', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            $table->foreignId('credit_card_account_id')
                ->constrained('accounts')
                ->restrictOnDelete();

            $table->foreignId('source_account_id')
                ->constrained('accounts')
                ->restrictOnDelete();

            $table->string('competence_month', 7); // YYYY-MM
            $table->decimal('amount', 12, 2);
            $table->date('date');

            $table->string('description', 255)->nullable();
            $table->text('note')->nullable();

            // transações espelho criadas no ato da antecipação
            $table->foreignId('bank_transaction_id')
                ->nullable()
                ->constrained('transactions')
                ->nullOnDelete();

            $table->foreignId('card_transaction_id')
                ->nullable()
                ->constrained('transactions')
                ->nullOnDelete();

            $table->timestamps();

            $table->index(['user_id', 'credit_card_account_id', 'competence_month'], 'cc_adv_user_card_month_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('credit_card_invoice_advances');
    }
};