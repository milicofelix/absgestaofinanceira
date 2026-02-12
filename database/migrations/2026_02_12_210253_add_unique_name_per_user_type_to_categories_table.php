<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // 1) garante que não exista duplicado antes de criar o UNIQUE
        //    (se já existir, renomeia adicionando sufixo: " (2)", " (3)", etc.)
        $duplicates = DB::table('categories')
            ->select('user_id', 'type', 'name', DB::raw('COUNT(*) as cnt'))
            ->groupBy('user_id', 'type', 'name')
            ->having('cnt', '>', 1)
            ->get();

        foreach ($duplicates as $dup) {
            $rows = DB::table('categories')
                ->where('user_id', $dup->user_id)
                ->where('type', $dup->type)
                ->where('name', $dup->name)
                ->orderBy('id')
                ->get(['id', 'name']);

            // mantém o primeiro como está e renomeia os demais
            $i = 2;
            foreach ($rows->skip(1) as $row) {
                DB::table('categories')
                    ->where('id', $row->id)
                    ->update(['name' => "{$row->name} ({$i})"]);
                $i++;
            }
        }

        // 2) cria o índice UNIQUE (user_id + type + name)
        Schema::table('categories', function (Blueprint $table) {
            $table->unique(['user_id', 'type', 'name'], 'categories_user_type_name_unique');
        });
    }

    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->dropUnique('categories_user_type_name_unique');
        });
    }
};
