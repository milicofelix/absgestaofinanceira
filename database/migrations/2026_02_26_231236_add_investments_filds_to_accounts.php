<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            // % do CDI (100.00, 101.00, ...)
            $table->decimal('cdi_percent', 6, 2)->default(100)->after('initial_balance');

            // liga/desliga rendimento automático
            $table->boolean('yield_enabled')->default(false)->after('cdi_percent');

            // último dia aplicado (pra idempotência)
            $table->date('last_yield_date')->nullable()->after('yield_enabled');
        });
    }

    public function down(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->dropColumn(['cdi_percent', 'yield_enabled', 'last_yield_date']);
        });
    }
};