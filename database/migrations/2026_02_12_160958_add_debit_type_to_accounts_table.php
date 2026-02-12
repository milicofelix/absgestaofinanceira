<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // MySQL: altera o ENUM incluindo 'debit'
        \DB::statement("
            ALTER TABLE accounts
            MODIFY type ENUM('cash', 'bank', 'credit_card', 'debit', 'other')
            NOT NULL
            DEFAULT 'bank'
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Volta ao enum anterior
        \DB::statement("
            ALTER TABLE accounts
            MODIFY type ENUM('cash', 'bank', 'credit_card', 'other')
            NOT NULL
            DEFAULT 'bank'
        ");
    }
};
