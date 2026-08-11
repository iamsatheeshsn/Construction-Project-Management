<?php

namespace App\Modules\Site\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Modules\Site\Models\SiteDiaryEquipment */
class SiteDiaryEquipmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'site_diary_id' => $this->site_diary_id,
            'equipment_name' => $this->equipment_name,
            'quantity' => $this->quantity,
            'hours' => $this->hours,
            'remarks' => $this->remarks,
        ];
    }
}
