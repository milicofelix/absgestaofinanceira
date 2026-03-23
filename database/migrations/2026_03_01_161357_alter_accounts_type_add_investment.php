<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }
        // DB::table('accounts')->where('type', 'investimento')->update(['type' => 'investment']);

        DB::statement("
            ALTER TABLE accounts
            MODIFY type ENUM(
                'bank',
                'credit_card',
                'cash',
                'debit',
                'investment'
            ) NOT NULL
        ");
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }
        // Se alguém tiver conta investment, precisamos converter para um tipo existente
        DB::table('accounts')
            ->where('type', 'investment')
            ->update(['type' => 'bank']); // escolha: bank (ou cash)

        DB::statement("
            ALTER TABLE accounts
            MODIFY type ENUM(
                'bank',
                'credit_card',
                'cash',
                'debit'
            ) NOT NULL
        ");
    }
};