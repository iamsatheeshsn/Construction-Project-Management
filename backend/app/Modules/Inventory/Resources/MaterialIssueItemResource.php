<?php

namespace App\Modules\Inventory\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Modules\Inventory\Models\MaterialIssueItem */
class MaterialIssueItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'inventory_item_id' => $this->inventory_item_id,
            'description' => $this->description,
            'unit' => $this->unit,
            'quantity' => $this->quantity,
            'inventory_item' => new InventoryItemResource($this->whenLoaded('inventoryItem')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
