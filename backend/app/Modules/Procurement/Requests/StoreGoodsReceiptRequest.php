<?php

namespace App\Modules\Procurement\Requests;

use App\Shared\Support\RouteId;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreGoodsReceiptRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $projectId = RouteId::from($this, 'project');

        return [
            'purchase_order_id' => ['required', 'integer', Rule::exists('purchase_orders', 'id')],
            'warehouse_id' => ['nullable', 'integer', Rule::exists('warehouses', 'id')],
            'grn_no' => [
                'required',
                'string',
                'max:80',
                Rule::unique('goods_receipts', 'grn_no')->where(fn ($q) => $q->where('project_id', $projectId)->whereNull('deleted_at')),
            ],
            'received_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
