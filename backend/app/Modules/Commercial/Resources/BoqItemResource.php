<?php

namespace App\Modules\Commercial\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Modules\Commercial\Models\BoqItem */
class BoqItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'boq_id' => $this->boq_id,
            'parent_id' => $this->parent_id,
            'wbs_id' => $this->wbs_id,
            'cost_code_id' => $this->cost_code_id,
            'item_no' => $this->item_no,
            'description' => $this->description,
            'unit' => $this->unit,
            'quantity' => $this->quantity,
            'rate' => $this->rate,
            'amount' => $this->amount,
            'sort_order' => $this->sort_order,
            'wbs' => $this->whenLoaded('wbs', fn () => $this->wbs ? [
                'id' => $this->wbs->id,
                'code' => $this->wbs->code,
                'name' => $this->wbs->name,
            ] : null),
            'cost_code' => $this->whenLoaded('costCode', fn () => $this->costCode ? [
                'id' => $this->costCode->id,
                'code' => $this->costCode->code,
                'name' => $this->costCode->name,
            ] : null),
        ];
    }
}
