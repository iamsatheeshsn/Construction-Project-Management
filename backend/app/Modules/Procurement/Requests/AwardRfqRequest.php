<?php

namespace App\Modules\Procurement\Requests;

use App\Shared\Support\RouteId;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AwardRfqRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $projectId = RouteId::from($this, 'project');

        return [
            'quotation_id' => [
                'required',
                'integer',
                Rule::exists('supplier_quotations', 'id')->where(fn ($q) => $q->where('project_id', $projectId)->whereNull('deleted_at')),
            ],
            'warehouse_id' => ['nullable', 'integer', Rule::exists('warehouses', 'id')],
            'create_po' => ['nullable', 'boolean'],
            'po_no' => [
                'nullable',
                'string',
                'max:80',
                Rule::unique('purchase_orders', 'po_no')->where(fn ($q) => $q->where('project_id', $projectId)->whereNull('deleted_at')),
            ],
        ];
    }
}
