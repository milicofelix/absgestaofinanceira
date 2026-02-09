<?php

namespace App\Http\Controllers;

use App\Models\RecurringTransaction;
use App\Models\Account;
use App\Models\Category;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RecurringTransactionController extends Controller
{
  public function index(Request $request)
  {
    $userId = $request->user()->id;

    $items = RecurringTransaction::query()
      ->where('user_id', $userId)
      ->with(['account:id,name','category:id,name'])
      ->orderByDesc('is_active')
      ->orderBy('next_run_date')
      ->paginate(15)
      ->withQueryString();

    return Inertia::render('Recurrings/Index', [
      'recurrings' => $items,
    ]);
  }

  public function create(Request $request)
  {
    $userId = $request->user()->id;

    return Inertia::render('Recurrings/Form', [
      'mode' => 'create',
      'recurring' => null,
      'accounts' => Account::where('user_id',$userId)->orderBy('name')->get(['id','name']),
      'categories' => Category::where('user_id',$userId)->orderBy('name')->get(['id','name','type']),
    ]);
  }

  public function store(Request $request)
  {
    $userId = $request->user()->id;

    $data = $request->validate([
      'account_id' => ['required','integer'],
      'category_id' => ['nullable','integer'],
      'type' => ['required','in:income,expense'],
      'description' => ['nullable','string','max:255'],
      'amount' => ['required','numeric','min:0.01'],
      'frequency' => ['required','in:monthly,yearly'],
      'interval' => ['nullable','integer','min:1','max:60'],
      'start_date' => ['nullable','date'],
      'end_date' => ['nullable','date'],
      'next_run_date' => ['required','date'],
      'auto_post' => ['boolean'],
      'is_active' => ['boolean'],
    ]);

    $data['user_id'] = $userId;
    $data['interval'] = $data['interval'] ?? 1;

    RecurringTransaction::create($data);

    return redirect()->route('recurrings.index');
  }

  public function edit(Request $request, RecurringTransaction $recurring)
  {
    abort_unless($recurring->user_id === $request->user()->id, 403);

    $userId = $request->user()->id;

    return Inertia::render('Recurrings/Form', [
      'mode' => 'edit',
      'recurring' => $recurring->only([
        'id','account_id','category_id','type','description','amount',
        'frequency','interval','start_date','end_date','next_run_date',
        'auto_post','is_active',
      ]),
      'accounts' => Account::where('user_id',$userId)->orderBy('name')->get(['id','name']),
      'categories' => Category::where('user_id',$userId)->orderBy('name')->get(['id','name','type']),
    ]);
  }

  public function update(Request $request, RecurringTransaction $recurring)
  {
    abort_unless($recurring->user_id === $request->user()->id, 403);

    $data = $request->validate([
      'account_id' => ['required','integer'],
      'category_id' => ['nullable','integer'],
      'type' => ['required','in:income,expense'],
      'description' => ['nullable','string','max:255'],
      'amount' => ['required','numeric','min:0.01'],
      'frequency' => ['required','in:monthly,yearly'],
      'interval' => ['nullable','integer','min:1','max:60'],
      'start_date' => ['nullable','date'],
      'end_date' => ['nullable','date'],
      'next_run_date' => ['required','date'],
      'auto_post' => ['boolean'],
      'is_active' => ['boolean'],
    ]);

    $data['interval'] = $data['interval'] ?? 1;

    $recurring->update($data);

    return redirect()->route('recurrings.index');
  }

  public function destroy(Request $request, RecurringTransaction $recurring)
  {
    abort_unless($recurring->user_id === $request->user()->id, 403);
    $recurring->delete();
    return redirect()->route('recurrings.index');
  }
}

