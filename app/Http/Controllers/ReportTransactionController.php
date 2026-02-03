<?php

namespace App\Http\Controllers;

use App\Exports\TransactionsExport;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;
use Maatwebsite\Excel\Excel as ExcelFormat;

class ReportTransactionController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $filters = $this->validatedFilters($request);

        $query = Transaction::query()
            ->where('user_id', $userId)
            ->with(['category:id,name,type', 'account:id,name']); // ajuste conforme seus relacionamentos

        $this->applyFilters($query, $filters);

        $transactions = $query
            ->orderBy('date', 'desc')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Reports/Transactions', [
            'filters' => $filters,
            'transactions' => $transactions,
        ]);
    }

    public function export(Request $request)
    {
        $userId = $request->user()->id;

        $filters = $this->validatedFilters($request);

        $format = strtolower((string) $request->query('format', 'xlsx'));
        if (!in_array($format, ['xlsx', 'csv'], true)) {
            $format = 'xlsx';
        }

        $fileName = 'transactions_' . now()->format('Y-m-d_His') . '.' . $format;

        $export = new TransactionsExport($userId, $filters);

        if ($format === 'csv') {
            Excel::extend(Excel::class, function () {});
            return Excel::download(
                $export,
                $fileName,
                ExcelFormat::CSV,
                ['Content-Type' => 'text/csv; charset=UTF-8']
            );
        }


        return Excel::download($export, $fileName, ExcelFormat::XLSX);
    }

    private function validatedFilters(Request $request): array
    {
        return $request->validate([
            'date_from'      => ['nullable', 'date'],
            'date_to'        => ['nullable', 'date'],
            'month'          => ['nullable', 'date_format:Y-m'],
            'type'           => ['nullable', 'in:income,expense'],
            'payment_method' => ['nullable', 'in:pix,card,cash,transfer,other'],
            'category_id'    => ['nullable', 'integer'],
            'account_id'     => ['nullable', 'integer'],
            'q'              => ['nullable', 'string', 'max:100'],
        ]);

    }

    private function applyFilters($query, array $filters): void
    {
        if (!empty($filters['date_from'])) {
            $query->whereDate('date', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->whereDate('date', '<=', $filters['date_to']);
        }
        if (!empty($filters['type'])) {
            $query->where('type', $filters['type']);
        }
        if (!empty($filters['category_id'])) {
            $query->where('category_id', (int) $filters['category_id']);
        }
        if (!empty($filters['account_id'])) {
            $query->where('account_id', (int) $filters['account_id']);
        }
        if (!empty($filters['payment_method'])) {
            $query->where('payment_method', $filters['payment_method']);
        }
        if (!empty($filters['q'])) {
            $q = trim($filters['q']);
            $query->where(function ($sub) use ($q) {
                $sub->where('description', 'like', "%{$q}%")
                    ->orWhere('note', 'like', "%{$q}%");
            });
        }
    }
}
