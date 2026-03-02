<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Services\InvestmentService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class InvestmentController extends Controller
{
    public function __construct(private InvestmentService $service) {}

    public function index(Request $request)
    {
        $userId = (int) $request->user()->id;

        $month = (string) ($request->get('month') ?: now()->format('Y-m')); // YYYY-MM
        $filters = [
            'month' => $month,
        ];

        $data = $this->service->getIndexData($userId, $filters);

        return Inertia::render('Investments/Index', [
            'filters' => $filters,
            'accounts' => $data['accounts'],
            'totals' => $data['totals'],
        ]);
    }

    public function show(Request $request, Account $account)
    {
        $userId = (int) $request->user()->id;

        // Segurança + consistência
        abort_if((int)$account->user_id !== $userId, 403);
        abort_if($account->type !== 'investment', 404);

        $from = (string) ($request->get('from') ?: now()->startOfMonth()->toDateString()); // YYYY-MM-DD
        $to   = (string) ($request->get('to')   ?: now()->toDateString());

        $filters = [
            'from' => $from,
            'to' => $to,
        ];

        $data = $this->service->getShowData($account->id, $userId, $filters);

        return Inertia::render('Investments/Show', [
            'filters' => $filters,
            'account' => $data['account'],
            'summary' => $data['summary'],
            'series'  => $data['series'],   // gráfico
            'events'  => $data['events'],   // aportes/saques/rendimentos
        ]);
    }
}