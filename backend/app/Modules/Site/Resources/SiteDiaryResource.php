<?php

namespace App\Modules\Site\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Modules\Site\Models\SiteDiary */
class SiteDiaryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'report_date' => optional($this->report_date)?->toDateString(),
            'weather' => $this->weather,
            'temperature_c' => $this->temperature_c,
            'work_completed' => $this->work_completed,
            'work_planned' => $this->work_planned,
            'issues' => $this->issues,
            'delays' => $this->delays,
            'visitors' => $this->visitors,
            'remarks' => $this->remarks,
            'status' => $this->status,
            'prepared_by' => $this->prepared_by,
            'approved_by' => $this->approved_by,
            'approved_at' => optional($this->approved_at)?->toIso8601String(),
            'labours_count' => $this->whenCounted('labours'),
            'equipment_count' => $this->whenCounted('equipment'),
            'materials_count' => $this->whenCounted('materials'),
            'labours' => SiteDiaryLabourResource::collection($this->whenLoaded('labours')),
            'equipment' => SiteDiaryEquipmentResource::collection($this->whenLoaded('equipment')),
            'materials' => SiteDiaryMaterialResource::collection($this->whenLoaded('materials')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
