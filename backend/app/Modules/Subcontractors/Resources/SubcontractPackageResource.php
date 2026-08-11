<?php

namespace App\Modules\Subcontractors\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Modules\Subcontractors\Models\SubcontractPackage */
class SubcontractPackageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'subcontractor_id' => $this->subcontractor_id,
            'package_no' => $this->package_no,
            'title' => $this->title,
            'description' => $this->description,
            'status' => $this->status,
            'currency' => $this->currency,
            'contract_value' => $this->contract_value,
            'retention_percent' => $this->retention_percent,
            'start_date' => optional($this->start_date)?->toDateString(),
            'end_date' => optional($this->end_date)?->toDateString(),
            'awarded_at' => optional($this->awarded_at)?->toIso8601String(),
            'created_by' => $this->created_by,
            'items_count' => $this->whenCounted('items'),
            'subcontractor' => new SubcontractorResource($this->whenLoaded('subcontractor')),
            'items' => SubcontractPackageItemResource::collection($this->whenLoaded('items')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
