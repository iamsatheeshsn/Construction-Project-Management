<?php

namespace App\Modules\Projects\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Modules\Projects\Models\Project */
class ProjectResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_code' => $this->project_code,
            'name' => $this->name,
            'description' => $this->description,
            'location' => $this->location,
            'country_code' => $this->country_code,
            'currency' => $this->currency,
            'status' => $this->status,
            'start_date' => optional($this->start_date)?->toDateString(),
            'end_date' => optional($this->end_date)?->toDateString(),
            'budget_amount' => $this->budget_amount,
            'contract_value' => $this->contract_value,
            'progress_percent' => $this->progress_percent,
            'company_id' => $this->company_id,
            'client_id' => $this->client_id,
            'consultant_id' => $this->consultant_id,
            'company' => $this->whenLoaded('company', fn () => [
                'id' => $this->company?->id,
                'name' => $this->company?->name,
            ]),
            'client' => $this->whenLoaded('client', fn () => [
                'id' => $this->client?->id,
                'name' => $this->client?->name,
                'code' => $this->client?->code,
            ]),
            'members_count' => $this->whenCounted('members'),
            'wbs_count' => $this->whenCounted('wbsNodes'),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
