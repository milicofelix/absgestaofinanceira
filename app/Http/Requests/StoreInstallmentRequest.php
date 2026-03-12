<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreInstallmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        $userId = $this->user()->id;

        return [
            'account_id' => [
                'required',
                'integer',
                Rule::exists('accounts', 'id')
                    ->where('user_id', $userId)
                    ->where('type', 'credit_card'),
            ],

            'category_id' => [
                'required',
                'integer',
                Rule::exists('categories', 'id')
                    ->where('user_id', $userId)
                    ->where('type', 'expense'),
            ],

            'description' => ['nullable', 'string', 'max:255'],

            'total_amount' => ['required', 'numeric', 'min:0.01'],

            'installments_count' => ['required', 'integer', 'min:2', 'max:60'],

            'purchase_date' => ['required', 'date_format:Y-m-d'],

            'first_due_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:purchase_date'],
        ];
    }

    public function attributes(): array
    {
        return [
            'account_id' => 'conta do cartão',
            'category_id' => 'categoria',
            'description' => 'descrição',
            'total_amount' => 'valor total',
            'installments_count' => 'quantidade de parcelas',
            'purchase_date' => 'data da compra',
            'first_due_date' => 'primeiro vencimento',
        ];
    }

    public function messages(): array
    {
        return [
            'account_id.required' => 'Selecione a conta do cartão.',
            'account_id.exists' => 'Selecione uma conta de cartão válida.',

            'category_id.required' => 'Selecione a categoria.',
            'category_id.exists' => 'Selecione uma categoria de despesa válida.',

            'total_amount.required' => 'Informe o valor total da compra.',
            'total_amount.numeric' => 'O valor total da compra deve ser um número válido.',
            'total_amount.min' => 'O valor total da compra deve ser maior que zero.',

            'installments_count.required' => 'Informe a quantidade de parcelas.',
            'installments_count.integer' => 'A quantidade de parcelas deve ser um número inteiro.',
            'installments_count.min' => 'A quantidade mínima de parcelas é 2.',
            'installments_count.max' => 'A quantidade máxima de parcelas é 60.',

            'purchase_date.required' => 'Informe a data da compra.',
            'purchase_date.date_format' => 'A data da compra deve estar no formato AAAA-MM-DD.',

            'first_due_date.date_format' => 'O primeiro vencimento deve estar no formato AAAA-MM-DD.',
            'first_due_date.after_or_equal' => 'O primeiro vencimento deve ser igual ou posterior à data da compra.',
        ];
    }
}
