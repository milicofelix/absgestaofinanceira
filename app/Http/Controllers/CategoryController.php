<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCategoryRequest;
use App\Http\Requests\UpdateCategoryRequest;
use App\Models\Category;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        $categories = Category::query()
            ->where('user_id', $request->user()->id)
            ->orderBy('type')
            ->orderBy('name')
            ->get(['id','name','type','color']);

        return Inertia::render('Categories/Index', [
            'categories' => $categories,
        ]);
    }

    public function create()
    {
        return Inertia::render('Categories/Form', [
            'mode' => 'create',
            'category' => null,
        ]);
    }

    public function store(StoreCategoryRequest $request)
    {
        Category::create([
            'user_id' => $request->user()->id,
            'name' => $request->string('name'),
            'type' => $request->string('type'),
            'color' => $request->input('color'),
        ]);

        return redirect()->route('categories.index');
    }

    public function edit(Category $category, Request $request)
    {
        abort_unless($category->user_id === $request->user()->id, 403);

        return Inertia::render('Categories/Form', [
            'mode' => 'edit',
            'category' => $category->only(['id','name','type','color']),
        ]);
    }

    public function update(UpdateCategoryRequest $request, Category $category)
    {
        abort_unless($category->user_id === $request->user()->id, 403);

        $category->update([
            'name' => $request->string('name'),
            'type' => $request->string('type'),
            'color' => $request->input('color'),
        ]);

        return redirect()->route('categories.index');
    }

    public function destroy(Category $category, Request $request)
    {
        abort_unless($category->user_id === $request->user()->id, 403);

        if ($category->transactions()->exists()) {
            return back()->with('error', 'Não é possível excluir: existem transações usando essa categoria.');
        }

        $category->delete();
        return redirect()->route('categories.index')->with('success', 'Categoria excluída.');
    }
}
