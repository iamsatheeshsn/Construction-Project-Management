<?php

namespace App\Modules\Procurement\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Modules\Procurement\Models\MaterialRequest */
class MaterialRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'request_no' => $this->request_no,
            'title' => $this->title,
            'needed_by' => $this->needed_by?->toDateString(),
            'status' => $this->status,
            'notes' => $this->notes,
            'requested_by' => $this->requested_by,
            'approved_by' => $this->approved_by,
            'approved_at' => optional($this->approved_at)?->toIso8601String(),
            'items_count' => $this->whenCounted('items'),
            'items' => MaterialRequestItemResource::collection($this->whenLoaded('items')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
