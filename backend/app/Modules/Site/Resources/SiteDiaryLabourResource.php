<?php

namespace App\Modules\Site\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Modules\Site\Models\SiteDiaryLabour */
class SiteDiaryLabourResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'site_diary_id' => $this->site_diary_id,
            'trade' => $this->trade,
            'company_name' => $this->company_name,
            'headcount' => $this->headcount,
            'hours' => $this->hours,
            'remarks' => $this->remarks,
        ];
    }
}
