<?php

namespace App\Modules\Commercial\Requests;

use App\Shared\Support\RouteId;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCostCodeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = app(\App\Core\Tenant\TenantManager::class)->id();
        $projectId = RouteId::from($this, 'project');

        return [
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('cost_codes', 'code')->where(fn ($q) => $q->where('tenant_id', $tenantId)->where('project_id', $projectId)),
            ],
            'name' => ['required', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:120'],
            'description' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
