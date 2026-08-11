<?php

namespace App\Modules\Subcontractors\Requests;

use App\Core\Tenant\TenantManager;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSubcontractorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = app(TenantManager::class)->id();
        $subcontractorId = $this->route('subcontractor');

        return [
            'code' => [
                'sometimes',
                'string',
                'max:80',
                Rule::unique('subcontractors', 'code')
                    ->where(fn ($q) => $q->where('tenant_id', $tenantId)->whereNull('deleted_at'))
                    ->ignore($subcontractorId),
            ],
            'name' => ['sometimes', 'string', 'max:255'],
            'trade' => ['nullable', 'string', 'max:120'],
            'contact_name' => ['nullable', 'string', 'max:160'],
            'email' => ['nullable', 'email', 'max:190'],
            'phone' => ['nullable', 'string', 'max:40'],
            'address' => ['nullable', 'string'],
            'status' => ['nullable', Rule::in(['active', 'inactive', 'blacklisted'])],
            'quality_score' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'schedule_score' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'cost_score' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'safety_score' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
