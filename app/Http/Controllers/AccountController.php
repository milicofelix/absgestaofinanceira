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
            ->get(['id','name','type','initial_balance']);

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
        Account::create([
            'user_id' => $request->user()->id,
            'name' => $request->string('name'),
            'type' => $request->string('type'),
            'initial_balance' => $request->input('initial_balance', 0),
        ]);

        return redirect()->route('accounts.index');
    }

    public function edit(Account $account, Request $request)
    {
        abort_unless($account->user_id === $request->user()->id, 403);

        return Inertia::render('Accounts/Form', [
            'mode' => 'edit',
            'account' => $account->only(['id','name','type','initial_balance']),
        ]);
    }

    public function update(UpdateAccountRequest $request, Account $account)
    {
        abort_unless($account->user_id === $request->user()->id, 403);

        $account->update([
            'name' => $request->string('name'),
            'type' => $request->string('type'),
            'initial_balance' => $request->input('initial_balance', 0),
        ]);

        return redirect()->route('accounts.index');
    }

    public function destroy(Account $account, Request $request)
    {
        abort_unless($account->user_id === $request->user()->id, 403);
        $account->delete();

        return redirect()->route('accounts.index');
    }
}
