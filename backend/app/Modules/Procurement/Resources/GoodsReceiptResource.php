<?php

namespace App\Modules\Procurement\Resources;

use App\Modules\Inventory\Resources\WarehouseResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Modules\Procurement\Models\GoodsReceipt */
class GoodsReceiptResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'purchase_order_id' => $this->purchase_order_id,
            'warehouse_id' => $this->warehouse_id,
            'grn_no' => $this->grn_no,
            'received_date' => $this->received_date?->toDateString(),
            'status' => $this->status,
            'notes' => $this->notes,
            'received_by' => $this->received_by,
            'posted_at' => optional($this->posted_at)?->toIso8601String(),
            'items_count' => $this->whenCounted('items'),
            'items' => GoodsReceiptItemResource::collection($this->whenLoaded('items')),
            'warehouse' => new WarehouseResource($this->whenLoaded('warehouse')),
            'purchase_order' => new PurchaseOrderResource($this->whenLoaded('purchaseOrder')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
