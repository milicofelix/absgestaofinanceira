<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTransactionRequest;
use App\Http\Requests\UpdateTransactionRequest;
use Illuminate\Database\QueryException;
use App\Http\Requests\MarkPaidRequest;
use App\Models\Account;
use App\Models\Category;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;
use App\Services\CreditCardPaymentService;

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
            ->where(function ($q) use ($month, $start, $end) {
                $q->where('competence_month', $month)
                ->orWhere(function ($q2) use ($start, $end) {
                    $q2->whereNull('competence_month')
                        ->whereBetween('date', [$start->toDateString(), $end->toDateString()]);
                });
            })
            ->with([
                'category:id,name',
                'account:id,name,type,statement_close_day',
                'installment:id,installments_count,is_active'
            ])

            // ✅ 1) primeiro as NÃO parceladas (installment_id NULL)
            // ✅ 2) depois as parceladas (installment_id NOT NULL)
            ->orderByRaw('(installment_id IS NOT NULL) ASC')

            // ✅ dentro de cada grupo, mantém por data/id
            ->orderByDesc('date')
            ->orderByDesc('id');

        if ($request->filled('type')) {
            $query->where('type', $request->string('type')->toString());
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
            $v = $request->string('installment')->toString();
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
            'return_month' => $request->query('month'),
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

         // ✅ data da compra
        $purchaseYmd = $dateYmd;

        //  calcula competência
        $competenceMonth = $this->computeCompetenceMonth($account, $dateYmd);

        $idemKey = $this->buildIdempotencyKey(
            $userId,
            (int) $account->id,
            (string) $request->string('type'),
            $purchaseYmd,
            $request->input('amount'),
            $request->input('description')
        );

        try {
            Transaction::create([
                'user_id' => $userId,
                'type' => $request->string('type'),
                'amount' => $request->input('amount'),
                'date' => $dateYmd,
                'purchase_date' => $dateYmd,
                'competence_month' => $competenceMonth, // ✅ NOVO
                'description' => $request->input('description'),
                'category_id' => $request->integer('category_id'),
                'account_id' => $account->id,
                'payment_method' => $request->input('payment_method'),
                'idempotency_key' => $idemKey,
            ]);
        } catch (QueryException $e) {
            // 1062 = duplicate key (MySQL)
            if ((int) ($e->errorInfo[1] ?? 0) === 1062) {
                return back()->withErrors([
                    'description' => 'Parece um lançamento duplicado (mesma conta, tipo, data da compra e valor). Confira antes de salvar.',
                ])->withInput();
            }
            throw $e;
        }

        // ✅ redireciona para o mês de COMPETÊNCIA (pra compra do dia 31/jan cair em fev, por exemplo)
        return redirect()->route('transactions.index', ['month' => $competenceMonth]);
    }

    public function edit(Transaction $transaction, Request $request)
    {
        abort_unless($transaction->user_id === $request->user()->id, 403);

        $userId = $request->user()->id;

        return Inertia::render('Transactions/Form', [
            'mode' => 'edit',
            'return_month' => $request->query('month'),
            'transaction' => [
                'id' => $transaction->id,
                'type' => $transaction->type,
                'amount' => (float)$transaction->amount,
                'date' => $transaction->date->format('Y-m-d'),
                'purchase_date' => $transaction->purchase_date->format('Y-m-d'),
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

    public function show(Transaction $transaction, Request $request)
    {
        abort_unless($transaction->user_id === $request->user()->id, 403);

        $transaction->loadMissing([
            'category:id,name',
            'account:id,name,type,statement_close_day,due_day',
            'installment:id,installments_count,is_active'
        ]);

        $isInstallment = !empty($transaction->installment_id);

        $totalAmount = null;
        $installments = [];

        if ($isInstallment) {
            $rows = Transaction::query()
                ->where('user_id', $request->user()->id)
                ->where('installment_id', $transaction->installment_id)
                ->orderBy('installment_number')
                ->get(['id','date','purchase_date','amount','is_cleared','cleared_at','installment_number','competence_month']);

            $totalAmount = (float) $rows->sum('amount');

            $installments = $rows->map(function ($t) {
                return [
                    'id' => $t->id,
                    'installment_number' => $t->installment_number,
                    'amount' => (float) $t->amount,
                    'date' => $t->date?->format('Y-m-d'),
                    'purchase_date' => $t->purchase_date?->format('Y-m-d'),
                    'competence_month' => $t->competence_month,
                    'is_cleared' => (bool) $t->is_cleared,
                    'cleared_at' => $t->cleared_at ? Carbon::parse($t->cleared_at)->format('Y-m-d') : null,
                ];
            })->values();
        }

        return response()->json([
            'transaction' => [
                'id' => $transaction->id,
                'type' => $transaction->type,
                'amount' => (float) $transaction->amount,
                'date' => $transaction->date?->format('Y-m-d'),
                'purchase_date' => $transaction->purchase_date?->format('Y-m-d'),
                'competence_month' => $transaction->competence_month,
                'description' => $transaction->description,
                'payment_method' => $transaction->payment_method,
                'is_cleared' => (bool) $transaction->is_cleared,
                'cleared_at' => $transaction->cleared_at ? Carbon::parse($transaction->cleared_at)->format('Y-m-d') : null,
                'category' => $transaction->category,
                'account' => $transaction->account,
                'installment' => $transaction->installment,
                'installment_id' => $transaction->installment_id,
                'installment_number' => $transaction->installment_number,
            ],
            'summary' => [
                'is_installment' => $isInstallment,
                'total_amount' => $totalAmount,              // ✅ total da compra (somatório das parcelas)
                'installments_count' => $transaction->installment?->installments_count,
                'is_active' => $transaction->installment?->is_active,
            ],
            'installments' => $installments,                 // ✅ lista das parcelas
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

        // regra: se não for parcela, compra acompanha date
        $purchaseYmd = $transaction->installment_id ? $transaction->purchase_date->format('Y-m-d') : $dateYmd;

        $idemKey = $this->buildIdempotencyKey(
            $userId,
            (int) $account->id,
            (string) $request->string('type'),
            $purchaseYmd,
            $request->input('amount'),
            $request->input('description')
        );

        try {
            $transaction->update([
                'type' => $request->string('type'),
                'amount' => $request->input('amount'),
                'date' => $dateYmd,
                // ✅ regra simples:
                // - se for lançamento normal (sem installment_id), atualiza purchase_date junto
                // - se for parcela, não mexe (evita bagunçar histórico)
                'purchase_date' => $transaction->installment_id ? $transaction->purchase_date : $dateYmd,
                'competence_month' => $competenceMonth, // ✅ NOVO
                'description' => $request->input('description'),
                'category_id' => $request->integer('category_id'),
                'account_id' => $account->id,
                'payment_method' => $request->input('payment_method'),
                'is_cleared' => $request->boolean('is_cleared'),
                'idempotency_key' => $idemKey
            ]);
        } catch (QueryException $e) {
            if ((int) ($e->errorInfo[1] ?? 0) === 1062) {
                return back()->withErrors([
                    'description' => 'Esse ajuste deixaria o lançamento duplicado (mesma conta, tipo, data da compra e valor).',
                ])->withInput();
            }
            throw $e;
        }

        return redirect()->route('transactions.index', ['month' => $competenceMonth]);
    }

    public function destroy(Transaction $transaction, Request $request)
    {
        abort_unless($transaction->user_id === $request->user()->id, 403);
         // ✅ mês de contexto (tela/lista que o usuário estava)
        $returnMonth = $request->query('month');

        // fallback: mês do próprio lançamento (se não veio month)
        $fallbackMonth = $transaction->competence_month
            ?: $transaction->date->format('Y-m');

        $transaction->delete();

        return redirect()->route('transactions.index', [
            'month' => $returnMonth ?: $fallbackMonth,
        ]);
    }

    private function computeCompetenceMonth(Account $account, string $dateYmd): string
    {
        $purchase = Carbon::createFromFormat('Y-m-d', $dateYmd, config('app.timezone'))->startOfDay();

        // Não é cartão de crédito ou não tem fechamento -> competência é o mês da data
        if (($account->type ?? null) !== 'credit_card' || empty($account->statement_close_day)) {
            return $purchase->format('Y-m');
        }

        $closeDay = max(1, min(31, (int) $account->statement_close_day));

        // Se não tiver due_day, mantém o comportamento antigo (vencimento no mês seguinte ao fechamento)
        $dueDayRaw = (int) ($account->due_day ?? 0);
        if ($dueDayRaw <= 0) {
            $closingThisMonth = $purchase->copy()->day(min($closeDay, $purchase->daysInMonth))->startOfDay();
            $statementMonth = $purchase->lessThanOrEqualTo($closingThisMonth)
                ? $purchase->copy()
                : $purchase->copy()->addMonthNoOverflow();

            return $statementMonth->copy()->addMonthNoOverflow()->format('Y-m');
        }

        $dueDay = max(1, min(31, $dueDayRaw));

        // Data de fechamento no mês da compra (ajusta para último dia do mês quando necessário)
        $closingThisMonth = $purchase->copy()->day(min($closeDay, $purchase->daysInMonth))->startOfDay();

        // 1) statementMonth = mês em que a fatura FECHA
        // Se comprou até o dia de fechamento (inclusive), fecha no mesmo mês; senão, fecha no próximo.
        $statementMonth = $purchase->lessThanOrEqualTo($closingThisMonth)
            ? $purchase->copy()
            : $purchase->copy()->addMonthNoOverflow();

        // 2) competenceMonth = mês em que a fatura VENCE/PAGA
        // Regra:
        // - se due_day > close_day => vence no mesmo mês do fechamento
        // - se due_day <= close_day => vence no mês seguinte ao fechamento
        $dueMonth = $statementMonth->copy()->startOfMonth();
        if ($dueDay <= $closeDay) {
            $dueMonth->addMonthNoOverflow();
        }

        return $dueMonth->format('Y-m');
    }

    public function markPaid(MarkPaidRequest $request, Transaction $transaction, CreditCardPaymentService $svc)
    {
        abort_unless($transaction->user_id === $request->user()->id, 403);

        $transaction->loadMissing('account');

        $bankId = (int) $request->input('paid_bank_account_id');
        $clearedAt = $request->input('cleared_at'); // "YYYY-MM-DD" ou null

        // Cartão + despesa => cria transferência e quita
        if (($transaction->account->type ?? null) === 'credit_card' && $transaction->type === 'expense') {
            $svc->payExpense($transaction, $bankId, $clearedAt);

            return back()->with('success', 'Pagamento registrado e dívida do cartão atualizada.');
        }

        // Não cartão => só quita o lançamento
        $transaction->is_cleared = true;
        $transaction->cleared_at = $clearedAt ? $clearedAt.' 00:00:00' : now();
        $transaction->save();

        return back()->with('success', 'Transação marcada como paga.');
    }

    private function normalizeDesc(?string $s): string
    {
        $s = (string)($s ?? '');
        $s = mb_strtolower($s);
        $s = preg_replace('/\s+/', ' ', trim($s));
        // remove acentos
        $s = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s) ?: $s;
        // remove caracteres “ruidosos”
        $s = preg_replace('/[^a-z0-9 \-_.]/', '', $s);
        return trim($s);
    }

    private function amountToCents($amount): int
    {
        // robusto pra "1234.56" e floats
        return (int) round(((float) $amount) * 100);
    }

    private function buildIdempotencyKey(int $userId, int $accountId, string $type, string $purchaseDateYmd, $amount, ?string $description): string
    {
        $desc = $this->normalizeDesc($description);
        $cents = $this->amountToCents($amount);

        // payload “humano” + hash curto (evita estourar tamanho)
        $raw = "{$userId}|{$accountId}|{$type}|{$purchaseDateYmd}|{$cents}|{$desc}";
        return substr(hash('sha256', $raw), 0, 64);
    }

}
