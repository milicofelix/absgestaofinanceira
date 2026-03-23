<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    private function dropFkIfExists(string $table, string $column): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        $db = DB::getDatabaseName();

        $fkName = DB::table('information_schema.KEY_COLUMN_USAGE')
            ->where('TABLE_SCHEMA', $db)
            ->where('TABLE_NAME', $table)
            ->where('COLUMN_NAME', $column)
            ->whereNotNull('CONSTRAINT_NAME')
            ->where('CONSTRAINT_NAME', '<>', 'PRIMARY')
            ->value('CONSTRAINT_NAME');

        if ($fkName) {
            DB::statement("ALTER TABLE `{$table}` DROP FOREIGN KEY `{$fkName}`");
        }
    }

    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            // SQLite não suporta esse tipo de alteração complexa
            return;
        }
        // drop FK (se existir) com nome real
        $this->dropFkIfExists('transactions', 'category_id');

        Schema::table('transactions', function (Blueprint $table) {
            $table->unsignedBigInteger('category_id')->nullable()->change();
        });

        // recria FK (se você quer manter)
        Schema::table('transactions', function (Blueprint $table) {
            $table->foreign('category_id')->references('id')->on('categories')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }
        // drop FK (se existir) com nome real
        $this->dropFkIfExists('transactions', 'category_id');

        // preencher NULL antes de voltar pra NOT NULL
        $defaultCategoryId = DB::table('categories')->min('id');

        if ($defaultCategoryId) {
            DB::table('transactions')
                ->whereNull('category_id')
                ->update(['category_id' => $defaultCategoryId]);
        } else {
            // sem categories: evita quebrar rollback
            // opção 1: não volta pra NOT NULL
            Schema::table('transactions', function (Blueprint $table) {
                $table->unsignedBigInteger('category_id')->nullable()->change();
            });

            return;
        }

        Schema::table('transactions', function (Blueprint $table) {
            $table->unsignedBigInteger('category_id')->nullable(false)->change();
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->foreign('category_id')->references('id')->on('categories')->restrictOnDelete();
        });
    }
};