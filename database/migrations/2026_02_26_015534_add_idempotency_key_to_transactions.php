<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->string('idempotency_key', 80)->nullable()->after('competence_month');
            $table->unique(['user_id', 'idempotency_key'], 'ux_transactions_user_idemkey');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropUnique('ux_transactions_user_idemkey');
            $table->dropColumn('idempotency_key');
        });
    }
};