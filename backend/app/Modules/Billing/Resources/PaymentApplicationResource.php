<?php

namespace App\Modules\Billing\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Modules\Billing\Models\PaymentApplication */
class PaymentApplicationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'contract_id' => $this->contract_id,
            'application_no' => $this->application_no,
            'period_start' => optional($this->period_start)?->toDateString(),
            'period_end' => optional($this->period_end)?->toDateString(),
            'status' => $this->status,
            'gross_amount' => $this->gross_amount,
            'retention_amount' => $this->retention_amount,
            'advance_recovery' => $this->advance_recovery,
            'net_amount' => $this->net_amount,
            'submitted_at' => optional($this->submitted_at)?->toIso8601String(),
            'contract' => $this->whenLoaded('contract', fn () => [
                'id' => $this->contract?->id,
                'contract_no' => $this->contract?->contract_no,
                'title' => $this->contract?->title,
            ]),
            'items_count' => $this->whenCounted('items'),
            'items' => PaymentApplicationItemResource::collection($this->whenLoaded('items')),
            'certificate' => new PaymentCertificateResource($this->whenLoaded('certificate')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
