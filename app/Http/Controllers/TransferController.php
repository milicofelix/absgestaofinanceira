<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Category;
use App\Models\Transaction;
use App\Models\TransferContact;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class TransferController extends Controller
{
    public function create(Request $request)
    {
        $userId = $request->user()->id;

        $accounts = Account::where('user_id', $userId)
            ->where('type', 'bank')
            ->orderBy('name')
            ->get(['id', 'name', 'type']);

        // contatos permitidos
        $contacts = User::query()
            ->join('transfer_contacts as tc', 'tc.contact_user_id', '=', 'users.id')
            ->where('tc.user_id', $userId)
            ->orderBy('users.name')
            ->get(['users.id', 'users.name', 'users.email']);

        return Inertia::render('Transfers/Form', [
            'accounts' => $accounts,
            'contacts' => $contacts,
            'defaultDate' => now()->format('Y-m-d'),
            'defaultRecipientMode' => 'self', // self | other
        ]);
    }

    // retorna contas do destinatário (apenas se for contato permitido)
    public function recipientAccounts(Request $request)
    {
        $userId = $request->user()->id;

        $request->validate([
            'recipient_user_id' => ['required', 'integer'],
        ]);

        $recipientUserId = (int) $request->integer('recipient_user_id');

        $allowed = TransferContact::query()
            ->where('user_id', $userId)
            ->where('contact_user_id', $recipientUserId)
            ->exists();

        abort_unless($allowed, 403);

        $accounts = Account::where('user_id', $recipientUserId)
            ->where('type', 'bank')
            ->orderBy('name')
            ->get(['id', 'name', 'type']);

        return response()->json(['accounts' => $accounts]);
    }

    public function store(Request $request)
    {
        $userId = $request->user()->id;

        $data = $request->validate([
            'recipient_mode' => ['required', Rule::in(['self', 'other'])],

            'from_account_id' => [
                'required', 'integer',
                Rule::exists('accounts', 'id')->where(fn ($q) => $q->where('user_id', $userId)->where('type', 'bank')),
            ],

            // self: conta destino também é do usuário logado
            // other: conta destino é do recipient_user_id (validamos abaixo)
            'to_account_id' => ['required', 'integer'],

            'recipient_user_id' => ['nullable', 'integer'],

            'amount' => ['required', 'numeric', 'gt:0'],
            'date' => ['required', 'date'],
            'description' => ['nullable', 'string', 'max:255'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $mode = $data['recipient_mode'];
        $amount = $data['amount'];
        $date = $data['date'];
        $desc = trim($data['description'] ?? '') ?: 'Transferência';
        $groupId = (string) Str::uuid();

        if ($mode === 'self') {
            // valida to_account_id (também do user logado) e diferente
            $request->validate([
                'to_account_id' => [
                    'required', 'integer', 'different:from_account_id',
                    Rule::exists('accounts', 'id')->where(fn ($q) => $q->where('user_id', $userId)->where('type', 'bank')),
                ],
            ]);

            // categorias específicas (internas)
            $catOut = Category::firstOrCreate(
                ['user_id' => $userId, 'type' => 'expense', 'name' => 'Transferência (Saída)'],
                ['color' => null]
            );

            $catIn = Category::firstOrCreate(
                ['user_id' => $userId, 'type' => 'income', 'name' => 'Transferência (Entrada)'],
                ['color' => null]
            );

            DB::transaction(function () use ($userId, $data, $amount, $date, $desc, $groupId, $catOut, $catIn) {
                Transaction::create([
                    'transfer_group_id' => $groupId,
                    'user_id' => $userId,
                    'counterparty_user_id' => null,
                    'type' => 'expense',
                    'amount' => $amount,
                    'date' => $date,
                    'description' => $desc . ' (Saída)',
                    'note' => $data['note'] ?? null,
                    'category_id' => $catOut->id,
                    'account_id' => $data['from_account_id'],
                    'payment_method' => 'transfer',
                    'is_transfer' => true, // ✅ interna
                ]);

                Transaction::create([
                    'transfer_group_id' => $groupId,
                    'user_id' => $userId,
                    'counterparty_user_id' => null,
                    'type' => 'income',
                    'amount' => $amount,
                    'date' => $date,
                    'description' => $desc . ' (Entrada)',
                    'note' => $data['note'] ?? null,
                    'category_id' => $catIn->id,
                    'account_id' => $data['to_account_id'],
                    'payment_method' => 'transfer',
                    'is_transfer' => true, // ✅ interna
                ]);
            });
        } else {
            // modo other: valida recipient + permissão + conta destino
            $request->validate([
                'recipient_user_id' => ['required', 'integer', 'different:user_id'],
            ]);

            $recipientUserId = (int) $data['recipient_user_id'];

            $allowed = TransferContact::query()
                ->where('user_id', $userId)
                ->where('contact_user_id', $recipientUserId)
                ->exists();

            abort_unless($allowed, 403);

            // valida conta destino pertence ao destinatário
            $toOk = Account::query()
                ->where('id', (int) $data['to_account_id'])
                ->where('user_id', $recipientUserId)
                ->where('type', 'bank')
                ->exists();

            abort_unless($toOk, 422);

            // categorias “reais” (externas) — aqui você pode escolher usar categoria normal (ex.: "Transferência enviada/recebida")
            $catOut = Category::firstOrCreate(
                ['user_id' => $userId, 'type' => 'expense', 'name' => 'Transferência enviada'],
                ['color' => null]
            );

            $catIn = Category::firstOrCreate(
                ['user_id' => $recipientUserId, 'type' => 'income', 'name' => 'Transferência recebida'],
                ['color' => null]
            );

            DB::transaction(function () use ($userId, $recipientUserId, $data, $amount, $date, $desc, $groupId, $catOut, $catIn) {
                // saída do remetente (gasto real)
                Transaction::create([
                    'transfer_group_id' => $groupId,
                    'user_id' => $userId,
                    'counterparty_user_id' => $recipientUserId,
                    'type' => 'expense',
                    'amount' => $amount,
                    'date' => $date,
                    'description' => $desc . ' (Enviada)',
                    'note' => $data['note'] ?? null,
                    'category_id' => $catOut->id,
                    'account_id' => $data['from_account_id'],
                    'payment_method' => 'transfer',
                    'is_transfer' => false, // ✅ externa entra no dashboard
                ]);

                // entrada do destinatário (receita real)
                Transaction::create([
                    'transfer_group_id' => $groupId,
                    'user_id' => $recipientUserId,
                    'counterparty_user_id' => $userId,
                    'type' => 'income',
                    'amount' => $amount,
                    'date' => $date,
                    'description' => $desc . ' (Recebida)',
                    'note' => $data['note'] ?? null,
                    'category_id' => $catIn->id,
                    'account_id' => $data['to_account_id'],
                    'payment_method' => 'transfer',
                    'is_transfer' => false, // ✅ externa entra no dashboard
                ]);
            });
        }

        $month = substr($date, 0, 7);
        return redirect()->route('transactions.index', ['month' => $month]);
    }

    public function recipientSearch(Request $request)
    {
        $userId = $request->user()->id;

        $q = trim((string) $request->query('q', ''));
        if (mb_strlen($q) < 2) return response()->json(['recipients' => []]);

        $recipients = \App\Models\User::query()
            ->join('transfer_contacts as tc', 'tc.contact_user_id', '=', 'users.id')
            ->where('tc.user_id', $userId)
            ->where('users.email', 'like', "%{$q}%")
            ->orderBy('users.email')
            ->limit(8)
            ->get(['users.id', 'users.name', 'users.email']);

        return response()->json(['recipients' => $recipients]);
    }

}
