<?php

namespace App\Modules\Commercial\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Modules\Commercial\Models\Boq */
class BoqResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'title' => $this->title,
            'version' => $this->version,
            'status' => $this->status,
            'currency' => $this->currency,
            'total_amount' => $this->total_amount,
            'notes' => $this->notes,
            'approved_at' => optional($this->approved_at)?->toIso8601String(),
            'approved_by' => $this->approved_by,
            'items_count' => $this->whenCounted('items'),
            'items' => BoqItemResource::collection($this->whenLoaded('items')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
