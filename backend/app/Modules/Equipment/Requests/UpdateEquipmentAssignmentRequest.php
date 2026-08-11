<?php

namespace App\Modules\Equipment\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateEquipmentAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'operator_name' => ['nullable', 'string', 'max:160'],
            'start_date' => ['sometimes', 'date'],
            'end_date' => ['nullable', 'date'],
            'daily_rate' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
