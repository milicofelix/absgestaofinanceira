<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
  public function up(): void
  {
    Schema::table('transactions', function (Blueprint $table) {
      $table->boolean('is_cleared')->default(false)->after('payment_method');
      $table->index(['user_id', 'is_cleared']);
    });
  }

  public function down(): void
  {
    Schema::table('transactions', function (Blueprint $table) {
      $table->dropColumn('is_cleared');
      $table->dropIndex(['user_id', 'is_cleared']);
    });
  }
};
