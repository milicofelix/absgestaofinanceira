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
}
