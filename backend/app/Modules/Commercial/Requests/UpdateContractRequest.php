<?php

namespace App\Modules\Commercial\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateContractRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = app(\App\Core\Tenant\TenantManager::class)->id();
        $contractId = (int) $this->route('contract');

        return [
            'contract_no' => [
                'sometimes',
                'required',
                'string',
                'max:80',
                Rule::unique('contracts', 'contract_no')
                    ->where(fn ($q) => $q->where('tenant_id', $tenantId)->whereNull('deleted_at'))
                    ->ignore($contractId),
            ],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'contract_type' => ['nullable', Rule::in(['main', 'subcontract', 'supply', 'consultancy'])],
            'status' => ['nullable', Rule::in(['draft', 'active', 'suspended', 'completed', 'terminated'])],
            'currency' => ['nullable', 'string', 'size:3'],
            'contract_value' => ['nullable', 'numeric', 'min:0'],
            'retention_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'advance_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'liquidated_damages_per_day' => ['nullable', 'numeric', 'min:0'],
            'payment_terms' => ['nullable', 'string'],
            'warranty_months' => ['nullable', 'integer', 'min:0'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'signed_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'client_id' => [
                'nullable',
                'integer',
                Rule::exists('clients', 'id')->where(fn ($q) => $q->where('tenant_id', $tenantId)->whereNull('deleted_at')),
            ],
        ];
    }
}
