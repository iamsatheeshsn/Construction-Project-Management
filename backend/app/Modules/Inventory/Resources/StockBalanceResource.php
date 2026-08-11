<?php

namespace App\Modules\Inventory\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Modules\Inventory\Models\StockBalance */
class StockBalanceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'warehouse_id' => $this->warehouse_id,
            'inventory_item_id' => $this->inventory_item_id,
            'project_id' => $this->project_id,
            'quantity' => $this->quantity,
            'avg_unit_cost' => $this->avg_unit_cost,
            'warehouse' => new WarehouseResource($this->whenLoaded('warehouse')),
            'inventory_item' => new InventoryItemResource($this->whenLoaded('inventoryItem')),
            'updated_at' => $this->updated_at,
        ];
    }
}
