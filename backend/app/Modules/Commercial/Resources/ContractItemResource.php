<?php

namespace App\Modules\Commercial\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Modules\Commercial\Models\ContractItem */
class ContractItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'contract_id' => $this->contract_id,
            'boq_item_id' => $this->boq_item_id,
            'description' => $this->description,
            'unit' => $this->unit,
            'quantity' => $this->quantity,
            'rate' => $this->rate,
            'amount' => $this->amount,
            'sort_order' => $this->sort_order,
            'boq_item' => $this->whenLoaded('boqItem', fn () => $this->boqItem ? [
                'id' => $this->boqItem->id,
                'item_no' => $this->boqItem->item_no,
                'description' => $this->boqItem->description,
            ] : null),
        ];
    }
}
