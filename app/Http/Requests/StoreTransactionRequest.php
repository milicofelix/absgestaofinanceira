<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTransactionRequest extends FormRequest
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
}
