<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCategoryBudgetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        return [
            'amount' => ['required', 'numeric', 'min:0.01'],
        ];
    }

    public function attributes(): array
    {
        return [
            'amount' => 'valor da meta',
        ];
    }

    public function messages(): array
    {
        return [
            'amount.required' => 'Informe o valor da meta.',
            'amount.numeric' => 'O valor da meta deve ser um número válido.',
            'amount.min' => 'O valor da meta deve ser maior que zero.',
        ];
    }
}
