<?php

namespace App\Modules\Equipment\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEquipmentUsageLogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'equipment_id' => ['required', 'integer', Rule::exists('equipment', 'id')],
            'equipment_assignment_id' => ['nullable', 'integer', Rule::exists('equipment_assignments', 'id')],
            'usage_date' => ['required', 'date'],
            'hours' => ['nullable', 'numeric', 'min:0'],
            'fuel_liters' => ['nullable', 'numeric', 'min:0'],
            'remarks' => ['nullable', 'string', 'max:255'],
        ];
    }
}
