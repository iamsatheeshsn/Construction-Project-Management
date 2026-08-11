<?php

namespace App\Modules\Procurement\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Modules\Procurement\Models\GoodsReceiptItem */
class GoodsReceiptItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'purchase_order_item_id' => $this->purchase_order_item_id,
            'inventory_item_id' => $this->inventory_item_id,
            'description' => $this->description,
            'unit' => $this->unit,
            'quantity' => $this->quantity,
            'unit_cost' => $this->unit_cost,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
