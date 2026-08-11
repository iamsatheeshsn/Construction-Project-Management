<?php

namespace App\Modules\Procurement\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Modules\Procurement\Models\SupplierQuotation */
class SupplierQuotationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'rfq_id' => $this->rfq_id,
            'supplier_id' => $this->supplier_id,
            'quote_no' => $this->quote_no,
            'status' => $this->status,
            'currency' => $this->currency,
            'valid_until' => optional($this->valid_until)?->toDateString(),
            'subtotal' => $this->subtotal,
            'tax_amount' => $this->tax_amount,
            'total_amount' => $this->total_amount,
            'lead_time_days' => $this->lead_time_days,
            'notes' => $this->notes,
            'submitted_at' => optional($this->submitted_at)?->toIso8601String(),
            'supplier' => new SupplierResource($this->whenLoaded('supplier')),
            'items' => SupplierQuotationItemResource::collection($this->whenLoaded('items')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
