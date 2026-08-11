<?php

namespace App\Modules\Procurement\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Modules\Procurement\Models\Rfq */
class RfqResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'purchase_request_id' => $this->purchase_request_id,
            'rfq_no' => $this->rfq_no,
            'title' => $this->title,
            'status' => $this->status,
            'due_date' => optional($this->due_date)?->toDateString(),
            'notes' => $this->notes,
            'awarded_quotation_id' => $this->awarded_quotation_id,
            'created_by' => $this->created_by,
            'sent_at' => optional($this->sent_at)?->toIso8601String(),
            'awarded_at' => optional($this->awarded_at)?->toIso8601String(),
            'items_count' => $this->whenCounted('items'),
            'suppliers_count' => $this->whenCounted('suppliers'),
            'quotations_count' => $this->whenCounted('quotations'),
            'items' => RfqItemResource::collection($this->whenLoaded('items')),
            'suppliers' => RfqSupplierResource::collection($this->whenLoaded('suppliers')),
            'awarded_quotation' => new SupplierQuotationResource($this->whenLoaded('awardedQuotation')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
