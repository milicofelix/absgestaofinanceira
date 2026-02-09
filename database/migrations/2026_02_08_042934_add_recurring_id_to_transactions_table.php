<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
  public function up(): void
  {
    Schema::table('transactions', function (Blueprint $table) {
      $table->foreignId('recurring_id')
        ->nullable()
        ->after('id')
        ->constrained('recurring_transactions')
        ->nullOnDelete();
      $table->index(['user_id', 'recurring_id']);
    });
  }

  public function down(): void
  {
    Schema::table('transactions', function (Blueprint $table) {
      $table->dropConstrainedForeignId('recurring_id');
    });
  }
};
