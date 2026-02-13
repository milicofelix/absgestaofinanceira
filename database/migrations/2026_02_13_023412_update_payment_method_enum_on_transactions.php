<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
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
        DB::statement("
            ALTER TABLE transactions
            MODIFY payment_method ENUM(
                'pix',
                'card',
                'cash',
                'transfer',
                'other'
            ) NULL
        ");
    }
};
