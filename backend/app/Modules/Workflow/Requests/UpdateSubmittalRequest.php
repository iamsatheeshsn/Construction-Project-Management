<?php

namespace App\Modules\Workflow\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSubmittalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'submittal_type' => ['sometimes', Rule::in(['material', 'shop_drawing', 'sample', 'technical', 'other'])],
            'due_date' => ['sometimes', 'nullable', 'date'],
        ];
    }
}
