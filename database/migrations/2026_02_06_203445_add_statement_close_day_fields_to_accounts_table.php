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
        Schema::table('accounts', function (Blueprint $table) {
            $table->unsignedTinyInteger('statement_close_day')->nullable();
            $table->unsignedTinyInteger('statement_close_month')->nullable();
            $table->unsignedTinyInteger('due_day')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->dropColumn('statement_close_day');
            $table->dropColumn('statement_close_month');
            $table->dropColumn('due_day');
        });
    }
};
