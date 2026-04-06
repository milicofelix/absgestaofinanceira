<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->decimal('yield_cap_amount', 15, 2)
                ->nullable()
                ->after('cdi_percent');

            $table->decimal('above_cap_cdi_percent', 8, 2)
                ->nullable()
                ->after('yield_cap_amount');
        });
    }

    public function down(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->dropColumn([
                'yield_cap_amount',
                'above_cap_cdi_percent',
            ]);
        });
    }
};