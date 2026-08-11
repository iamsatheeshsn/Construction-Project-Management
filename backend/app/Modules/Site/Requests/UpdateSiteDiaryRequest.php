<?php

namespace App\Modules\Site\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSiteDiaryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'weather' => ['sometimes', 'nullable', 'string', 'max:120'],
            'temperature_c' => ['sometimes', 'nullable', 'numeric'],
            'work_completed' => ['sometimes', 'nullable', 'string'],
            'work_planned' => ['sometimes', 'nullable', 'string'],
            'issues' => ['sometimes', 'nullable', 'string'],
            'delays' => ['sometimes', 'nullable', 'string'],
            'visitors' => ['sometimes', 'nullable', 'string'],
            'remarks' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', Rule::in(['draft'])],
        ];
    }
}
