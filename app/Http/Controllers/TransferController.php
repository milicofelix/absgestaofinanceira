<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use App\Models\Category;
use Illuminate\Validation\Rule;

class TransferController extends Controller
{
    public function create(Request $request)
    {
        $userId = $request->user()->id;

        return Inertia::render('Transfers/Form', [
            'accounts' => Account::where('user_id', $userId)->orderBy('name')->get(['id','name']),
            'defaultDate' => now()->format('Y-m-d'),
        ]);
    }

    public function store(Request $request)
    {
        $userId = $request->user()->id;

        $data = $request->validate([
            'from_account_id' => [
                'required',
                'integer',
                Rule::exists('accounts', 'id')->where(fn ($q) => $q->where('user_id', $userId)),
            ],
            'to_account_id' => [
                'required',
                'integer',
                'different:from_account_id',
                Rule::exists('accounts', 'id')->where(fn ($q) => $q->where('user_id', $userId)),
            ],
            'amount' => ['required', 'numeric', 'gt:0'],
            'date' => ['required', 'date'],
            'description' => ['nullable', 'string', 'max:255'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        // categorias específicas para não misturar com receitas/despesas reais
        $catOut = Category::firstOrCreate(
            ['user_id' => $userId, 'type' => 'expense', 'name' => 'Transferência (Saída)'],
            ['color' => null]
        );

        $catIn = Category::firstOrCreate(
            ['user_id' => $userId, 'type' => 'income', 'name' => 'Transferência (Entrada)'],
            ['color' => null]
        );

        $groupId = (string) Str::uuid();
        $desc = trim($data['description'] ?? '') ?: 'Transferência';

        DB::transaction(function () use ($userId, $data, $groupId, $desc, $catOut, $catIn) {
            // Saída (despesa) na conta origem
            Transaction::create([
                'transfer_group_id' => $groupId,
                'user_id' => $userId,
                'type' => 'expense',
                'amount' => $data['amount'],
                'date' => $data['date'],
                'description' => $desc . ' (Saída)',
                'note' => $data['note'] ?? null,
                'category_id' => $catOut->id,
                'account_id' => $data['from_account_id'],
                'payment_method' => 'transfer',
                'is_transfer' => true,
            ]);

            // Entrada (receita) na conta destino
            Transaction::create([
                'transfer_group_id' => $groupId,
                'user_id' => $userId,
                'type' => 'income',
                'amount' => $data['amount'],
                'date' => $data['date'],
                'description' => $desc . ' (Entrada)',
                'note' => $data['note'] ?? null,
                'category_id' => $catIn->id,
                'account_id' => $data['to_account_id'],
                'payment_method' => 'transfer',
                'is_transfer' => true,
            ]);
        });

        $month = substr($data['date'], 0, 7);
        return redirect()->route('transactions.index', ['month' => $month]);

    }
}
