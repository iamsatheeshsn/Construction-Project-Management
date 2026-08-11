<?php

namespace App\Modules\Inventory\Requests;

use App\Shared\Support\RouteId;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMaterialIssueRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $projectId = RouteId::from($this, 'project');

        return [
            'warehouse_id' => ['required', 'integer', Rule::exists('warehouses', 'id')],
            'issue_no' => [
                'required',
                'string',
                'max:80',
                Rule::unique('material_issues', 'issue_no')->where(fn ($q) => $q->where('project_id', $projectId)->whereNull('deleted_at')),
            ],
            'issue_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
