<?php

namespace App\Http\Controllers;

use App\Services\InstallmentService;
use Illuminate\Http\Request;
use App\Models\Installment;
use App\Models\Transaction;
use DB;

class InstallmentController extends Controller
{
  public function store(Request $request, InstallmentService $service)
  {
    $userId = $request->user()->id;

    $data = $request->validate([
      'account_id' => ['required','integer'],
      'category_id' => ['nullable','integer'],
      'description' => ['nullable','string','max:255'],
      'total_amount' => ['required','numeric','min:0.01'],
      'installments_count' => ['required','integer','min:2','max:60'],
      'first_due_date' => ['required','date'],
    ]);

    $data['user_id'] = $userId;

    $service->createInstallmentAndTransactions($data);

    return redirect()->route('transactions.index', [
      'month' => now()->format('Y-m'),
    ]);
  }

  public function cancel(Request $request, Installment $installment)
  {
    abort_unless($installment->user_id === $request->user()->id, 403);

    DB::transaction(function () use ($installment) {
      $installment->update(['is_active' => false]);

      // “cancela” apenas parcelas futuras não pagas
      Transaction::query()
        ->where('user_id', $installment->user_id)
        ->where('installment_id', $installment->id)
        ->where('is_cleared', false)
        ->whereDate('date', '>', now()->toDateString())
        ->delete();
    });

    return back();
  }
}

