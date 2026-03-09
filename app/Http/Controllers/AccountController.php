<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAccountRequest;
use App\Http\Requests\UpdateAccountRequest;
use App\Models\Account;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AccountController extends Controller
{
    public function index(Request $request)
    {
        $accounts = Account::query()
            ->where('user_id', $request->user()->id)
            ->orderBy('name')
            ->get([
                'id',
                'name',
                'type',
                'initial_balance', 
                'statement_close_day', 
                'statement_close_month', 
                'cdi_percent',
                'yield_enabled',
                'due_day', 
                'credit_limit',
                ]);

        return Inertia::render('Accounts/Index', [
            'accounts' => $accounts,
        ]);
    }

    public function create()
    {
        return Inertia::render('Accounts/Form', [
            'mode' => 'create',
            'account' => null,
        ]);
    }

    public function store(StoreAccountRequest $request)
    {
        $data = $request->only([
            'name','type','initial_balance','statement_close_day','statement_close_month',
            'yield_enabled','cdi_percent', 'due_day', 'credit_limit',
        ]);

        $data['user_id'] = $request->user()->id;

        // normalizações
        $data['name'] = $request->string('name')->toString();
        $data['type'] = $request->string('type')->toString();

        $data['initial_balance'] = $request->input('initial_balance', 0);
        $data['statement_close_day'] = $request->input('statement_close_day') ?: null;
        $data['due_day'] = $request->input('due_day') ?: null;
        $data['credit_limit'] = $request->filled('credit_limit')
            ? (float) $request->input('credit_limit')
            : null;
        $data['statement_close_month'] = $request->input('statement_close_month') ?: null;

        $data['yield_enabled'] = $request->boolean('yield_enabled');
        $data['cdi_percent'] = $request->filled('cdi_percent')
            ? (float) $request->input('cdi_percent')
            : 100;

        // se não for investment, limpa campos
        if ($data['type'] !== 'investment') {
            $data['yield_enabled'] = false;
            $data['cdi_percent'] = 100;
        }

        if ($data['type'] !== 'credit_card') {
            $data['credit_limit'] = null;
        }

        Account::create($data);

        return redirect()->route('accounts.index');
    }

    public function edit(Account $account, Request $request)
    {
        abort_unless($account->user_id === $request->user()->id, 403);

        return Inertia::render('Accounts/Form', [
            'mode' => 'edit',
            'account' => $account->only([
                'id','name','type','initial_balance',
                'statement_close_day', 'due_day', 'statement_close_month',
                'yield_enabled','cdi_percent','credit_limit',
            ]),
        ]);
    }

    public function update(UpdateAccountRequest $request, Account $account)
    {
        abort_unless($account->user_id === $request->user()->id, 403);

        $type = $request->string('type')->toString();

        $payload = [
            'name' => $request->string('name')->toString(),
            'type' => $type,
            'initial_balance' => $request->input('initial_balance', 0),
            'statement_close_day' => $request->input('statement_close_day') ?: null,
            'due_day' => $request->input('due_day') ?: null,
            'credit_limit' => $request->filled('credit_limit')
                ? (float) $request->input('credit_limit')
                : null,
            'statement_close_month' => $request->input('statement_close_month') ?: null,
            'yield_enabled' => $request->boolean('yield_enabled'),
            'cdi_percent' => $request->filled('cdi_percent')
                ? (float) $request->input('cdi_percent')
                : 100,
        ];

        if ($type !== 'investment') {
            $payload['yield_enabled'] = false;
            $payload['cdi_percent'] = 100;
        }

        if ($type !== 'credit_card') {
            $payload['credit_limit'] = null;
        }

        $account->update($payload);

        return redirect()->route('accounts.index');
    }

    public function destroy(Account $account, Request $request)
    {
        abort_unless($account->user_id === $request->user()->id, 403);
        $account->delete();

        return redirect()->route('accounts.index');
    }
}
