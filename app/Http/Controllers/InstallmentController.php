<?php

namespace App\Http\Controllers;

use App\Services\InstallmentService;
use App\Http\Requests\StoreInstallmentRequest;
use App\Models\Installment;
use App\Models\Transaction;
use DB;

class InstallmentController extends Controller
{
  public function store(StoreInstallmentRequest $request, InstallmentService $service)
  {

    $data = $request->validated();

    $data['user_id'] = $request->user()->id;

    $service->createInstallmentAndTransactions($data);

    return redirect()->route('transactions.index', [
      'month' => now()->format('Y-m'),
    ])->with('success', 'Parcela criada com sucesso!');
  }

  public function cancel(StoreInstallmentRequest $request, Installment $installment)
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

    return back()->with('success', 'Parcela cancelada com sucesso!');
  }
}

