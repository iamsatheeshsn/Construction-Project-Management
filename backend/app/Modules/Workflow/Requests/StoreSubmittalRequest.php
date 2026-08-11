<?php

namespace App\Modules\Workflow\Requests;

use App\Shared\Support\RouteId;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSubmittalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $projectId = RouteId::from($this, 'project');

        return [
            'submittal_no' => [
                'required',
                'string',
                'max:80',
                Rule::unique('submittals', 'submittal_no')->where(fn ($q) => $q->where('project_id', $projectId)->whereNull('deleted_at')),
            ],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'submittal_type' => ['nullable', Rule::in(['material', 'shop_drawing', 'sample', 'technical', 'other'])],
            'due_date' => ['nullable', 'date'],
            'status' => ['nullable', Rule::in(['draft'])],
        ];
    }
}
