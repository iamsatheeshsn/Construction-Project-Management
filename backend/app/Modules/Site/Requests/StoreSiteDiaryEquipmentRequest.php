<?php

namespace App\Modules\Site\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSiteDiaryEquipmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'equipment_name' => ['required', 'string', 'max:160'],
            'quantity' => ['nullable', 'integer', 'min:0'],
            'hours' => ['nullable', 'numeric', 'min:0'],
            'remarks' => ['nullable', 'string', 'max:255'],
        ];
    }
}
