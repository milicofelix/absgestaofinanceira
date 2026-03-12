<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCategoryBudgetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        $userId = $this->user()->id;

        return [
            'category_id' => [
                'required',
                'integer',
                Rule::exists('categories', 'id')->where('user_id', $userId),
            ],
            'year' => ['required', 'integer', 'min:2000', 'max:2100'],
            'month' => ['required', 'integer', 'min:1', 'max:12'],
            'amount' => ['required', 'numeric', 'min:0.01'],
        ];
    }

    public function attributes(): array
    {
        return [
            'category_id' => 'categoria',
            'year' => 'ano',
            'month' => 'mês',
            'amount' => 'valor da meta',
        ];
    }

    public function messages(): array
    {
        return [
            'category_id.required' => 'Selecione a categoria.',
            'category_id.exists' => 'A categoria selecionada é inválida.',
            'year.required' => 'Informe o ano da meta.',
            'year.integer' => 'O ano da meta deve ser um número inteiro.',
            'year.min' => 'O ano da meta deve ser maior ou igual a 2000.',
            'year.max' => 'O ano da meta deve ser menor ou igual a 2100.',
            'month.required' => 'Informe o mês da meta.',
            'month.integer' => 'O mês da meta deve ser um número inteiro.',
            'month.min' => 'O mês da meta deve ser entre 1 e 12.',
            'month.max' => 'O mês da meta deve ser entre 1 e 12.',
            'amount.required' => 'Informe o valor da meta.',
            'amount.numeric' => 'O valor da meta deve ser um número válido.',
            'amount.min' => 'O valor da meta deve ser maior que zero.',
        ];
    }
}
