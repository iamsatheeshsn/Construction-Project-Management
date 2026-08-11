<?php

namespace App\Modules\Commercial\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Modules\Commercial\Models\Variation */
class VariationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'contract_id' => $this->contract_id,
            'variation_no' => $this->variation_no,
            'title' => $this->title,
            'description' => $this->description,
            'reason' => $this->reason,
            'status' => $this->status,
            'cost_impact' => $this->cost_impact,
            'time_impact_days' => $this->time_impact_days,
            'submitted_at' => optional($this->submitted_at)?->toIso8601String(),
            'decided_at' => optional($this->decided_at)?->toIso8601String(),
            'contract' => $this->whenLoaded('contract', fn () => [
                'id' => $this->contract?->id,
                'contract_no' => $this->contract?->contract_no,
                'title' => $this->contract?->title,
            ]),
            'items_count' => $this->whenCounted('items'),
            'items' => VariationItemResource::collection($this->whenLoaded('items')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
