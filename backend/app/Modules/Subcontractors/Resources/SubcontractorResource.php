<?php

namespace App\Modules\Subcontractors\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Modules\Subcontractors\Models\Subcontractor */
class SubcontractorResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'trade' => $this->trade,
            'contact_name' => $this->contact_name,
            'email' => $this->email,
            'phone' => $this->phone,
            'address' => $this->address,
            'status' => $this->status,
            'quality_score' => $this->quality_score,
            'schedule_score' => $this->schedule_score,
            'cost_score' => $this->cost_score,
            'safety_score' => $this->safety_score,
            'notes' => $this->notes,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
