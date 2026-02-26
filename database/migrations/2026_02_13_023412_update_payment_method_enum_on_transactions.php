<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::table('transactions')
            ->where('payment_method', 'card')
            ->update(['payment_method' => 'credit_card']);
            
        DB::statement("
            ALTER TABLE transactions
            MODIFY payment_method ENUM(
                'pix',
                'debit_card',
                'credit_card',
                'cash',
                'transfer',
                'other'
            ) NULL
        ");
    }

   public function down(): void
    {
        // volta para um conjunto compatível (sem perder valores)
        DB::statement("
            ALTER TABLE transactions
            MODIFY payment_method ENUM(
                'pix',
                'debit_card',
                'credit_card',
                'cash',
                'transfer',
                'other'
            ) NULL
        ");
    }
};
