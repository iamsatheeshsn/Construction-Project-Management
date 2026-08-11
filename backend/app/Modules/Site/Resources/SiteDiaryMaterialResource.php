<?php

namespace App\Modules\Site\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Modules\Site\Models\SiteDiaryMaterial */
class SiteDiaryMaterialResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'site_diary_id' => $this->site_diary_id,
            'material_name' => $this->material_name,
            'unit' => $this->unit,
            'quantity' => $this->quantity,
            'remarks' => $this->remarks,
        ];
    }
}
