<?php

namespace App\Modules\Equipment\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Modules\Equipment\Models\Equipment */
class EquipmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'category' => $this->category,
            'ownership' => $this->ownership,
            'status' => $this->status,
            'manufacturer' => $this->manufacturer,
            'model' => $this->model,
            'serial_no' => $this->serial_no,
            'daily_rate' => $this->daily_rate,
            'notes' => $this->notes,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
