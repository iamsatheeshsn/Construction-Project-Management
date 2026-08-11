<?php

namespace App\Modules\Inventory\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMaterialIssueRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'warehouse_id' => ['sometimes', 'required', 'integer', Rule::exists('warehouses', 'id')],
            'issue_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
