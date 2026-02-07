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
        Schema::table('transactions', function (Blueprint $table) {
            $table->string('transfer_group_id', 36)->nullable()->change(); // se ainda não for string/uuid
            $table->unsignedBigInteger('counterparty_user_id')->nullable()->after('account_id');
            $table->index(['user_id', 'is_transfer', 'date']);
            $table->foreign('counterparty_user_id')->references('id')->on('users')->nullOnDelete();

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropForeign(['counterparty_user_id']);
            $table->dropColumn('counterparty_user_id');
        });
    }
};
