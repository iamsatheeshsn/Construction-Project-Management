<?php

namespace App\Modules\Commercial\Requests;

use App\Core\Tenant\TenantManager;
use App\Shared\Support\RouteId;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBoqItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $projectId = RouteId::from($this, 'project');
        $boqId = (int) $this->route('boq');
        $tenantId = app(TenantManager::class)->id();

        return [
            'parent_id' => [
                'nullable',
                'integer',
                Rule::exists('boq_items', 'id')->where(fn ($q) => $q->where('boq_id', $boqId)->whereNull('deleted_at')),
            ],
            'wbs_id' => [
                'nullable',
                'integer',
                Rule::exists('wbs', 'id')->where(fn ($q) => $q->where('project_id', $projectId)->whereNull('deleted_at')),
            ],
            'cost_code_id' => [
                'nullable',
                'integer',
                Rule::exists('cost_codes', 'id')->where(fn ($q) => $q->where('tenant_id', $tenantId)),
            ],
            'item_no' => [
                'required',
                'string',
                'max:50',
                Rule::unique('boq_items', 'item_no')->where(fn ($q) => $q->where('boq_id', $boqId)->whereNull('deleted_at')),
            ],
            'description' => ['required', 'string'],
            'unit' => ['nullable', 'string', 'max:30'],
            'quantity' => ['nullable', 'numeric', 'min:0'],
            'rate' => ['nullable', 'numeric', 'min:0'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
