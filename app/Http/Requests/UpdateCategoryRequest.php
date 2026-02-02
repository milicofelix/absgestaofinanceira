<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCategoryRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name'  => ['required', 'string', 'max:80'],
            'type'  => ['required', Rule::in(['income','expense'])],
            'color' => ['nullable', 'string', 'max:20'],
        ];
    }
}
