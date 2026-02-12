<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTransactionRequest;
use App\Http\Requests\UpdateTransactionRequest;
use App\Models\Account;
use App\Models\Category;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;

class TransactionController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $month = $request->query('month', now()->format('Y-m'));
        $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
        $end   = (clone $start)->endOfMonth();

        $query = Transaction::query()
            ->where('user_id', $userId)
            /**
             * filtra por competência quando existir.
             * - Se competence_month estiver preenchido => usa ele
             * - Se estiver NULL (dados antigos) => cai no filtro por date
             */
            ->where(function ($q) use ($month, $start, $end) {
                $q->where('competence_month', $month)
                  ->orWhere(function ($q2) use ($start, $end) {
                      $q2->whereNull('competence_month')
                         ->whereBetween('date', [$start->toDateString(), $end->toDateString()]);
                  });
            })
            ->with([
                'category:id,name',
                'account:id,name,type',
                'installment:id,installments_count,is_active'
            ])

            // se você quiser, pode ordenar por competência, mas manter por date é ok
            ->orderByDesc('date')
            ->orderByDesc('id');

        if ($request->filled('type')) {
            $query->where('type', $request->string('type'));
        }
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->integer('category_id'));
        }
        if ($request->filled('account_id')) {
            $query->where('account_id', $request->integer('account_id'));
        }
        if ($request->filled('q')) {
            $q = $request->string('q');
            $query->where('description', 'like', "%{$q}%");
        }
        if ($request->filled('installment')) {
            $v = $request->string('installment');
            if ($v === 'only') {
                $query->whereNotNull('installment_id');
            } elseif ($v === 'none') {
                $query->whereNull('installment_id');
            }
        }

        if ($request->filled('status')) {
            $status = (string) $request->query('status');

            if ($status === 'paid') {
                $query->where('is_cleared', true);
            } elseif ($status === 'open') {
                $query->where('is_cleared', false);
            }
        }

        $transactions = $query->paginate(15)->withQueryString();

        $categories = Category::query()
            ->where('user_id', $userId)
            ->orderBy('type')->orderBy('name')
            ->get(['id','name','type']);

        // (opcional) traz type e statement_close_day caso você queira mostrar no front
        $accounts = Account::query()
            ->where('user_id', $userId)
            ->orderBy('name')
            ->get(['id','name','type','statement_close_day']);

        return Inertia::render('Transactions/Index', [
            'filters' => [
                'month' => $month,
                'type' => $request->query('type'),
                'category_id' => $request->query('category_id'),
                'account_id' => $request->query('account_id'),
                'q' => $request->query('q'),
                'installment' => $request->query('installment'),
                'status' => $request->query('status'),
            ],
            'transactions' => $transactions,
            'categories' => $categories,
            'accounts' => $accounts,
        ]);
    }

    public function create(Request $request)
    {
        $userId = $request->user()->id;

        return Inertia::render('Transactions/Form', [
            'mode' => 'create',
            'transaction' => null,
            'categories' => Category::where('user_id', $userId)->orderBy('type')->orderBy('name')->get(['id','name','type']),
            // (opcional) traz type e statement_close_day caso você queira exibir/ajudar no front
            'accounts' => Account::where('user_id', $userId)->orderBy('name')->get(['id','name','type','statement_close_day']),
        ]);
    }

    public function store(StoreTransactionRequest $request)
    {
        $userId = $request->user()->id;

        $categoryOk = Category::where('id', $request->integer('category_id'))->where('user_id', $userId)->exists();
        $account = Account::where('id', $request->integer('account_id'))->where('user_id', $userId)->first();
        abort_unless($categoryOk && $account, 422);

        $dateYmd = $request->date('date')->format('Y-m-d');

        //  calcula competência
        $competenceMonth = $this->computeCompetenceMonth($account, $dateYmd);

        Transaction::create([
            'user_id' => $userId,
            'type' => $request->string('type'),
            'amount' => $request->input('amount'),
            'date' => $dateYmd,
            'competence_month' => $competenceMonth, // ✅ NOVO
            'description' => $request->input('description'),
            'category_id' => $request->integer('category_id'),
            'account_id' => $account->id,
            'payment_method' => $request->input('payment_method'),
        ]);

        // ✅ redireciona para o mês de COMPETÊNCIA (pra compra do dia 31/jan cair em fev, por exemplo)
        return redirect()->route('transactions.index', ['month' => $competenceMonth]);
    }

    public function edit(Transaction $transaction, Request $request)
    {
        abort_unless($transaction->user_id === $request->user()->id, 403);

        $userId = $request->user()->id;

        return Inertia::render('Transactions/Form', [
            'mode' => 'edit',
            'transaction' => [
                'id' => $transaction->id,
                'type' => $transaction->type,
                'amount' => (float)$transaction->amount,
                'date' => $transaction->date->format('Y-m-d'),
                'description' => $transaction->description,
                'category_id' => $transaction->category_id,
                'account_id' => $transaction->account_id,
                'payment_method' => $transaction->payment_method,
                'is_cleared' => $transaction->is_cleared,
            ],
            'categories' => Category::where('user_id', $userId)->orderBy('type')->orderBy('name')->get(['id','name','type']),
            'accounts' => Account::where('user_id', $userId)->orderBy('name')->get(['id','name','type','statement_close_day']),
            'mode' => 'edit',
        ]);
    }

    public function update(UpdateTransactionRequest $request, Transaction $transaction)
    {
        $userId = $request->user()->id;
        abort_unless($transaction->user_id === $userId, 403);

        $categoryOk = Category::where('id', $request->integer('category_id'))->where('user_id', $userId)->exists();
        $account = Account::where('id', $request->integer('account_id'))->where('user_id', $userId)->first();
        abort_unless($categoryOk && $account, 422);

        $dateYmd = $request->date('date')->format('Y-m-d');

        //  recalcula competência (pode mudar se trocar a conta ou a data)
        $competenceMonth = $this->computeCompetenceMonth($account, $dateYmd);

        $transaction->update([
            'type' => $request->string('type'),
            'amount' => $request->input('amount'),
            'date' => $dateYmd,
            'competence_month' => $competenceMonth, // ✅ NOVO
            'description' => $request->input('description'),
            'category_id' => $request->integer('category_id'),
            'account_id' => $account->id,
            'payment_method' => $request->input('payment_method'),
            'is_cleared' => $request->boolean('is_cleared'),
        ]);

        return redirect()->route('transactions.index', ['month' => $competenceMonth]);
    }

    public function destroy(Transaction $transaction, Request $request)
    {
        abort_unless($transaction->user_id === $request->user()->id, 403);
        $transaction->delete();

        return redirect()->route('transactions.index');
    }

    private function computeCompetenceMonth(Account $account, string $dateYmd): string
    {
        $purchase = Carbon::createFromFormat('Y-m-d', $dateYmd)->startOfDay();

        if (($account->type ?? null) !== 'credit_card' || empty($account->statement_close_day)) {
            return $purchase->format('Y-m');
        }

        $closeDay = max(1, min(28, (int) $account->statement_close_day));

        $closeThisMonth = $purchase->copy()
            ->day(min($closeDay, $purchase->daysInMonth))
            ->startOfDay();

        // antes do fechamento -> mês seguinte
        if ($purchase->lt($closeThisMonth)) {
            return $purchase->copy()->addMonthNoOverflow()->format('Y-m');
        }

        // no dia do fechamento ou depois -> +2 meses
        return $purchase->copy()->addMonthsNoOverflow(2)->format('Y-m');
    }

}
