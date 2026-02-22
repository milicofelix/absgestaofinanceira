<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {

            // guarda a conta que pagou a fatura (banco)
            if (!Schema::hasColumn('transactions', 'paid_bank_account_id')) {
                $table->unsignedBigInteger('paid_bank_account_id')
                    ->nullable()
                    ->after('account_id');

                $table->index('paid_bank_account_id');
            }

            // data/hora em que foi marcado como pago (opcional, mas recomendado)
            if (!Schema::hasColumn('transactions', 'cleared_at')) {
                $table->dateTime('cleared_at')
                    ->nullable()
                    ->after('is_cleared');

                $table->index('cleared_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            if (Schema::hasColumn('transactions', 'paid_bank_account_id')) {
                $table->dropIndex(['paid_bank_account_id']);
                $table->dropColumn('paid_bank_account_id');
            }

            if (Schema::hasColumn('transactions', 'cleared_at')) {
                $table->dropIndex(['cleared_at']);
                $table->dropColumn('cleared_at');
            }
        });
    }
};
