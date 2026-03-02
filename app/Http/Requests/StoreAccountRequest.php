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
                'nullable','integer','min:1','max:28',
                Rule::requiredIf(fn() => $this->input('type') === 'credit_card'),
            ],

            'statement_close_month' => ['nullable','integer','min:1','max:12'],

            // investimentos
            'yield_enabled' => ['nullable','boolean'],

            'cdi_percent' => [
                'nullable','numeric','min:0','max:300',
                Rule::requiredIf(fn() => $this->input('type') === 'investment'),
            ],
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