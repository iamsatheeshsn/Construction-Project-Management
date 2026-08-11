<?php

namespace App\Modules\Commercial\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Modules\Commercial\Models\VariationItem */
class VariationItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'variation_id' => $this->variation_id,
            'boq_item_id' => $this->boq_item_id,
            'cost_code_id' => $this->cost_code_id,
            'description' => $this->description,
            'unit' => $this->unit,
            'quantity' => $this->quantity,
            'rate' => $this->rate,
            'amount' => $this->amount,
        ];
    }
}
