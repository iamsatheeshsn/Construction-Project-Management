<?php

namespace App\Modules\Equipment\Requests;

use App\Core\Tenant\TenantManager;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEquipmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = app(TenantManager::class)->id();
        $equipmentId = $this->route('equipment');

        return [
            'code' => [
                'sometimes',
                'string',
                'max:80',
                Rule::unique('equipment', 'code')
                    ->where(fn ($q) => $q->where('tenant_id', $tenantId)->whereNull('deleted_at'))
                    ->ignore($equipmentId),
            ],
            'name' => ['sometimes', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:120'],
            'ownership' => ['nullable', Rule::in(['owned', 'rented', 'leased'])],
            'status' => ['nullable', Rule::in(['available', 'assigned', 'maintenance', 'retired'])],
            'manufacturer' => ['nullable', 'string', 'max:160'],
            'model' => ['nullable', 'string', 'max:160'],
            'serial_no' => ['nullable', 'string', 'max:120'],
            'daily_rate' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
