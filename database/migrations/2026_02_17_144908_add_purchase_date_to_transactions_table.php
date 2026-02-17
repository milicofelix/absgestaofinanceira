<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->date('purchase_date')->nullable()->after('date');
            $table->index(['user_id', 'purchase_date'], 'transactions_user_purchase_date_idx');
        });

        // ✅ Backfill simples e seguro:
        // - Para lançamentos "normais" (sem parcelamento), define purchase_date = date
        // - Para parcelados, deixamos NULL (pois a data real da compra não existe historicamente)
        DB::statement("
            UPDATE transactions
            SET purchase_date = date
            WHERE purchase_date IS NULL
              AND installment_id IS NULL
        ");
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropIndex('transactions_user_purchase_date_idx');
            $table->dropColumn('purchase_date');
        });
    }
};
