<?php

namespace App\Modules\Commercial\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Modules\Commercial\Models\Contract */
class ContractResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'client_id' => $this->client_id,
            'contract_no' => $this->contract_no,
            'title' => $this->title,
            'contract_type' => $this->contract_type,
            'status' => $this->status,
            'currency' => $this->currency,
            'contract_value' => $this->contract_value,
            'retention_percent' => $this->retention_percent,
            'advance_percent' => $this->advance_percent,
            'liquidated_damages_per_day' => $this->liquidated_damages_per_day,
            'payment_terms' => $this->payment_terms,
            'warranty_months' => $this->warranty_months,
            'start_date' => optional($this->start_date)?->toDateString(),
            'end_date' => optional($this->end_date)?->toDateString(),
            'signed_at' => optional($this->signed_at)?->toDateString(),
            'notes' => $this->notes,
            'client' => $this->whenLoaded('client', fn () => $this->client ? [
                'id' => $this->client->id,
                'name' => $this->client->name,
                'code' => $this->client->code,
            ] : null),
            'items_count' => $this->whenCounted('items'),
            'items' => ContractItemResource::collection($this->whenLoaded('items')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
