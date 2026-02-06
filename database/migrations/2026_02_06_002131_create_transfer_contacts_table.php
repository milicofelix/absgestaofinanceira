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
        Schema::create('transfer_contacts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');          // dono da lista
            $table->unsignedBigInteger('contact_user_id');  // usuário permitido
            $table->timestamps();

            $table->unique(['user_id', 'contact_user_id']);

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('contact_user_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transfer_contacts');
    }
};
