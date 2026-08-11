<?php

namespace App\Modules\Inventory\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Modules\Inventory\Models\MaterialIssue */
class MaterialIssueResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'warehouse_id' => $this->warehouse_id,
            'issue_no' => $this->issue_no,
            'issue_date' => $this->issue_date?->toDateString(),
            'status' => $this->status,
            'notes' => $this->notes,
            'issued_by' => $this->issued_by,
            'posted_at' => optional($this->posted_at)?->toIso8601String(),
            'items_count' => $this->whenCounted('items'),
            'items' => MaterialIssueItemResource::collection($this->whenLoaded('items')),
            'warehouse' => new WarehouseResource($this->whenLoaded('warehouse')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
