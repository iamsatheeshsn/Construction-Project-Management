<?php

namespace App\Modules\Projects\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = app(\App\Core\Tenant\TenantManager::class)->id();
        $projectId = $this->route('project');

        return [
            'project_code' => [
                'sometimes',
                'required',
                'string',
                'max:50',
                Rule::unique('projects', 'project_code')
                    ->where(fn ($q) => $q->where('tenant_id', $tenantId)->whereNull('deleted_at'))
                    ->ignore($projectId),
            ],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'location' => ['nullable', 'string', 'max:255'],
            'country_code' => ['nullable', 'string', 'size:2'],
            'currency' => ['nullable', 'string', 'size:3'],
            'status' => ['nullable', Rule::in([
                'lead', 'proposal', 'awarded', 'setup', 'planning', 'mobilization',
                'execution', 'monitoring', 'testing', 'handover', 'completed',
                'warranty', 'closed', 'on_hold', 'cancelled',
            ])],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'budget_amount' => ['nullable', 'numeric', 'min:0'],
            'contract_value' => ['nullable', 'numeric', 'min:0'],
            'progress_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'company_id' => ['nullable', 'integer', Rule::exists('companies', 'id')->where(fn ($q) => $q->where('tenant_id', $tenantId)->whereNull('deleted_at'))],
            'client_id' => ['nullable', 'integer', Rule::exists('clients', 'id')->where(fn ($q) => $q->where('tenant_id', $tenantId)->whereNull('deleted_at'))],
            'consultant_id' => ['nullable', 'integer', Rule::exists('consultants', 'id')->where(fn ($q) => $q->where('tenant_id', $tenantId)->whereNull('deleted_at'))],
        ];
    }
}
