<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
  public function up(): void
  {
    Schema::create('recurring_transactions', function (Blueprint $table) {
      $table->id();
      $table->foreignId('user_id')->constrained()->cascadeOnDelete();
      $table->foreignId('account_id')->constrained()->cascadeOnDelete();
      $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();

      $table->enum('type', ['income', 'expense']);
      $table->string('description')->nullable();
      $table->decimal('amount', 12, 2);

      $table->enum('frequency', ['monthly', 'yearly']); // dá pra expandir depois
      $table->unsignedTinyInteger('interval')->default(1); // 1 = todo mês/ano

      $table->date('start_date')->nullable();
      $table->date('end_date')->nullable();

      $table->date('next_run_date'); // chave do motor
      $table->boolean('auto_post')->default(true);
      $table->boolean('is_active')->default(true);

      $table->timestamps();

      $table->index(['user_id', 'is_active', 'next_run_date']);
    });
  }

  public function down(): void
  {
    Schema::dropIfExists('recurring_transactions');
  }
};

