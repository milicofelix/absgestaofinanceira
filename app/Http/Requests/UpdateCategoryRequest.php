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

    public function attributes(): array
    {
        return [
            'name' => 'nome da categoria',
            'type' => 'tipo',
            'color' => 'cor',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Informe o nome da categoria.',
            'name.max' => 'O nome da categoria deve ter no máximo 80 caracteres.',
            'type.required' => 'Selecione o tipo da categoria.',
            'type.in' => 'Selecione um tipo de categoria válido.',
            'color.max' => 'A cor deve ter no máximo 20 caracteres.',
        ];
    }
}
