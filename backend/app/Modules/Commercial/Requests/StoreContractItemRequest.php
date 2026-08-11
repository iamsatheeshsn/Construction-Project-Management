<?php

namespace App\Modules\Commercial\Requests;

use App\Shared\Support\RouteId;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreContractItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $projectId = RouteId::from($this, 'project');

        return [
            'boq_item_id' => [
                'nullable',
                'integer',
                Rule::exists('boq_items', 'id')->whereNull('deleted_at'),
            ],
            'description' => ['required_without:import_boq_id', 'string'],
            'unit' => ['nullable', 'string', 'max:30'],
            'quantity' => ['nullable', 'numeric', 'min:0'],
            'rate' => ['nullable', 'numeric', 'min:0'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'import_boq_id' => [
                'nullable',
                'integer',
                Rule::exists('boqs', 'id')->where(fn ($q) => $q->where('project_id', $projectId)->whereNull('deleted_at')),
            ],
        ];
    }
}
