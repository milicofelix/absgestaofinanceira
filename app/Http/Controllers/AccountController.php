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
            ->get(['id','name','type','initial_balance', 'statement_close_day', 'statement_close_month', 'cdi_percent','yield_enabled']);

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
            'yield_enabled','cdi_percent'
        ]);

        $data['user_id'] = $request->user()->id;

        // normalizações
        $data['name'] = $request->string('name')->toString();
        $data['type'] = $request->string('type')->toString();

        $data['initial_balance'] = $request->input('initial_balance', 0);
        $data['statement_close_day'] = $request->input('statement_close_day') ?: null;
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
                'statement_close_day','statement_close_month',
                'yield_enabled','cdi_percent',
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
