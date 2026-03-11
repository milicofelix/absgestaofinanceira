<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Models\Transaction;

class MarkPaidRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'paid_bank_account_id' => ['required', 'integer'],
            'cleared_at' => ['nullable', 'date_format:Y-m-d'],
        ];
    }

    public function attributes(): array
    {
        return [
            'paid_bank_account_id' => 'conta de pagamento',
            'cleared_at' => 'data de quitação',
        ];
    }

    public function messages(): array
    {
        return [
            'paid_bank_account_id.required' => 'Selecione a conta de pagamento.',
            'cleared_at.date_format' => 'A data de quitação deve estar no formato AAAA-MM-DD.',
        ];
    }
}
