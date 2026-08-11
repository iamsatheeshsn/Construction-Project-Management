<?php

namespace App\Modules\Procurement\Requests;

use App\Shared\Support\RouteId;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateRfqFromPrRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $projectId = RouteId::from($this, 'project');

        return [
            'purchase_request_id' => [
                'required',
                'integer',
                Rule::exists('purchase_requests', 'id')->where(fn ($q) => $q->where('project_id', $projectId)->whereNull('deleted_at')),
            ],
            'rfq_no' => [
                'nullable',
                'string',
                'max:80',
                Rule::unique('rfqs', 'rfq_no')->where(fn ($q) => $q->where('project_id', $projectId)->whereNull('deleted_at')),
            ],
            'title' => ['nullable', 'string', 'max:255'],
            'due_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
