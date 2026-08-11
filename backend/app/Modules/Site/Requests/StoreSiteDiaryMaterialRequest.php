<?php

namespace App\Modules\Site\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSiteDiaryMaterialRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'material_name' => ['required', 'string', 'max:160'],
            'unit' => ['nullable', 'string', 'max:30'],
            'quantity' => ['nullable', 'numeric', 'min:0'],
            'remarks' => ['nullable', 'string', 'max:255'],
        ];
    }
}
