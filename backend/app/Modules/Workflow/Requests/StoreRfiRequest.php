<?php

namespace App\Modules\Workflow\Requests;

use App\Shared\Support\RouteId;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRfiRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $projectId = RouteId::from($this, 'project');

        return [
            'rfi_no' => [
                'required',
                'string',
                'max:80',
                Rule::unique('rfis', 'rfi_no')->where(fn ($q) => $q->where('project_id', $projectId)->whereNull('deleted_at')),
            ],
            'subject' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'discipline' => ['nullable', 'string', 'max:80'],
            'priority' => ['nullable', Rule::in(['low', 'medium', 'high'])],
            'status' => ['nullable', Rule::in(['draft'])],
            'assigned_to' => [
                'nullable',
                'integer',
                Rule::exists('users', 'id'),
            ],
            'due_date' => ['nullable', 'date'],
        ];
    }
}
