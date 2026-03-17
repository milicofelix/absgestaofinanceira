<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCategoryBudgetDefaultRequest;
use App\Http\Requests\UpdateCategoryBudgetDefaultRequest;
use App\Models\CategoryBudgetDefault;
use Illuminate\Http\Request;

class CategoryBudgetDefaultController extends Controller
{
    public function store(StoreCategoryBudgetDefaultRequest $request)
    {
        $userId = $request->user()->id;

        CategoryBudgetDefault::updateOrCreate(
            [
                'user_id' => $userId,
                'category_id' => $request->integer('category_id'),
            ],
            [
                'amount' => $request->input('amount'),
            ]
        );

        return redirect()->route('budgets.index', [
            'month' => $request->input('month', now()->format('Y-m')),
        ])->with('success', 'Meta criada com sucesso!');
    }

    public function update(UpdateCategoryBudgetDefaultRequest $request, CategoryBudgetDefault $budgetDefault)
    {
        abort_unless($budgetDefault->user_id === $request->user()->id, 403);

        $budgetDefault->update([
            'amount' => $request->input('amount'),
        ]);

        return redirect()->route('budgets.index', [
            'month' => $request->input('month', now()->format('Y-m')),
        ])->with('success', 'Meta atualizada com sucesso!');
    }

    public function destroy(Request $request, CategoryBudgetDefault $budgetDefault)
    {
        abort_unless($budgetDefault->user_id === $request->user()->id, 403);

        $budgetDefault->delete();

        return redirect()->route('budgets.index', [
            'month' => $request->query('month', now()->format('Y-m')),
        ])->with('success', 'Meta excluida com sucesso!');
    }
}
