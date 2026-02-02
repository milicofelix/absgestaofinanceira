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
            'name'            => ['required', 'string', 'max:80'],
            'type'            => ['required', Rule::in(['cash','bank','credit_card','other'])],
            'initial_balance' => ['nullable', 'numeric'],
        ];
    }
}
