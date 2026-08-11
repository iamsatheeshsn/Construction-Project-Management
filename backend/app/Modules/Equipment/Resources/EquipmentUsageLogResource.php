<?php

namespace App\Modules\Equipment\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Modules\Equipment\Models\EquipmentUsageLog */
class EquipmentUsageLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'equipment_id' => $this->equipment_id,
            'equipment_assignment_id' => $this->equipment_assignment_id,
            'usage_date' => optional($this->usage_date)?->toDateString(),
            'hours' => $this->hours,
            'fuel_liters' => $this->fuel_liters,
            'remarks' => $this->remarks,
            'recorded_by' => $this->recorded_by,
            'equipment' => new EquipmentResource($this->whenLoaded('equipment')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
