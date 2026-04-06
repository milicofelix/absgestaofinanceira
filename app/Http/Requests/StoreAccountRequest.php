<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAccountRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name'  => ['required', 'string', 'max:80'],

            'type'  => ['required', Rule::in(['cash','bank','credit_card','other','debit','investment'])],

            'initial_balance' => ['nullable', 'numeric'],

            'statement_close_day' => [
                'nullable','integer','min:1','max:31',
                Rule::requiredIf(fn() => $this->input('type') === 'credit_card'),
            ],

            'statement_close_month' => ['nullable','integer','min:1','max:12'],

            // investimentos
            'yield_enabled' => ['nullable','boolean'],

            'cdi_percent' => [
                'nullable','numeric','min:0','max:300',
                // Rule::requiredIf(fn() => $this->input('type') === 'investment'),
            ],

            'credit_limit' => [
                Rule::requiredIf(fn () => $this->input('type') === 'credit_card'),
                'nullable',
                'numeric',
                'min:0',
            ],
            'yield_cap_amount' => [
                'nullable',
                'numeric',
                'min:0',
            ],
            'above_cap_cdi_percent' => [
                'nullable',
                'numeric',
                'min:0',
                'max:300',
            ],
        ];
    }

    public function attributes(): array
    {
        return [
            'name' => 'nome da conta',
            'type' => 'tipo de conta',
            'initial_balance' => 'saldo inicial',
            'statement_close_day' => 'dia de fechamento da fatura',
            'statement_close_month' => 'mês de fechamento',
            'yield_enabled' => 'rendimento automático',
            'cdi_percent' => 'percentual do CDI',
            'credit_limit' => 'limite do cartão',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Informe o nome da conta.',
            'type.required' => 'Selecione o tipo de conta.',
            'type.in' => 'Selecione um tipo de conta válido.',
            'initial_balance.numeric' => 'O saldo inicial deve ser um número válido.',
            'statement_close_day.required' => 'Informe o dia de fechamento da fatura.',
            'statement_close_day.integer' => 'O dia de fechamento da fatura deve ser um número inteiro.',
            'statement_close_day.min' => 'O dia de fechamento da fatura deve ser no mínimo 1.',
            'statement_close_day.max' => 'O dia de fechamento da fatura deve estar entre 1 e 31.',
            'statement_close_month.integer' => 'O mês de fechamento deve ser um número inteiro.',
            'statement_close_month.min' => 'O mês de fechamento deve ser entre 1 e 12.',
            'statement_close_month.max' => 'O mês de fechamento deve ser entre 1 e 12.',
            // 'cdi_percent.required' => 'Informe o percentual do CDI para a conta de investimento.',
            'cdi_percent.numeric' => 'O percentual do CDI deve ser um número válido.',
            'cdi_percent.min' => 'O percentual do CDI não pode ser negativo.',
            'cdi_percent.max' => 'O percentual do CDI não pode ser maior que 300.',
            'credit_limit.required' => 'Informe o limite do cartão.',
            'credit_limit.numeric' => 'O limite do cartão deve ser um número válido.',
            'credit_limit.min' => 'O limite do cartão não pode ser negativo.',
        ];
    }

    protected function prepareForValidation(): void
    {
        // ajuda a validar boolean quando chega "true"/"false" do JS
        $this->merge([
            'yield_enabled' => filter_var($this->input('yield_enabled'), FILTER_VALIDATE_BOOLEAN),
        ]);
    }
}