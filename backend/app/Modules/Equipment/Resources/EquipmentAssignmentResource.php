<?php

namespace App\Modules\Equipment\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Modules\Equipment\Models\EquipmentAssignment */
class EquipmentAssignmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'equipment_id' => $this->equipment_id,
            'assignment_no' => $this->assignment_no,
            'operator_name' => $this->operator_name,
            'start_date' => optional($this->start_date)?->toDateString(),
            'end_date' => optional($this->end_date)?->toDateString(),
            'daily_rate' => $this->daily_rate,
            'status' => $this->status,
            'notes' => $this->notes,
            'created_by' => $this->created_by,
            'equipment' => new EquipmentResource($this->whenLoaded('equipment')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
