<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
  public function up(): void
  {
    Schema::create('installments', function (Blueprint $table) {
      $table->id();
      $table->foreignId('user_id')->constrained()->cascadeOnDelete();
      $table->foreignId('account_id')->constrained()->cascadeOnDelete();
      $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();

      $table->string('description')->nullable();
      $table->decimal('total_amount', 12, 2);
      $table->unsignedSmallInteger('installments_count');
      $table->date('first_due_date');

      $table->boolean('is_active')->default(true);
      $table->timestamps();

      $table->index(['user_id', 'account_id']);
    });

    Schema::table('transactions', function (Blueprint $table) {
      $table->foreignId('installment_id')
        ->nullable()
        ->after('recurring_id')
        ->constrained('installments')
        ->nullOnDelete();

      $table->unsignedSmallInteger('installment_number')->nullable()->after('installment_id');
      $table->index(['user_id', 'installment_id']);
    });
  }

  public function down(): void
  {
    Schema::table('transactions', function (Blueprint $table) {
      $table->dropColumn('installment_number');
      $table->dropConstrainedForeignId('installment_id');
    });
    Schema::dropIfExists('installments');
  }
};
