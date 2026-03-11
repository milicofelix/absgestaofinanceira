<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTransactionRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'type'          => ['required', Rule::in(['income','expense'])],
            'amount'        => ['required', 'numeric', 'gt:0'],
            'date'          => ['required', 'date_format:Y-m-d'],
            'description'   => ['nullable', 'string', 'max:255'],
            'category_id'   => ['required', 'integer'],
            'account_id'    => ['required', 'integer'],
            'payment_method'=> ['required', Rule::in(['pix','debit_card','credit_card','cash','transfer','other'])],
        ];
    }

    public function attributes(): array
    {
        return [
            'type' => 'tipo',
            'amount' => 'valor',
            'date' => 'data',
            'description' => 'descrição',
            'category_id' => 'categoria',
            'account_id' => 'conta',
            'payment_method' => 'forma de pagamento',
        ];
    }

    public function messages(): array
    {
        return [
            'type.required' => 'Selecione o tipo da transação.',
            'type.in' => 'Selecione um tipo de transação válido.',
            'amount.required' => 'Informe o valor da transação.',
            'amount.numeric' => 'O valor da transação deve ser um número válido.',
            'amount.gt' => 'O valor da transação deve ser maior que zero.',
            'date.required' => 'Informe a data da transação.',
            'date.date_format' => 'A data da transação deve estar no formato AAAA-MM-DD.',
            'description.max' => 'A descrição deve ter no máximo 255 caracteres.',
            'category_id.required' => 'Selecione a categoria.',
            'account_id.required' => 'Selecione a conta.',
            'payment_method.required' => 'Selecione a forma de pagamento.',
            'payment_method.in' => 'Selecione uma forma de pagamento válida.',
        ];
    }
}