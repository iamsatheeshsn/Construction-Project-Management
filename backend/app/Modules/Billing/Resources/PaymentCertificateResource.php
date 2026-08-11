<?php

namespace App\Modules\Billing\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Modules\Billing\Models\PaymentCertificate */
class PaymentCertificateResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'payment_application_id' => $this->payment_application_id,
            'certificate_no' => $this->certificate_no,
            'certified_amount' => $this->certified_amount,
            'retention_held' => $this->retention_held,
            'certified_at' => optional($this->certified_at)?->toDateString(),
            'certified_by' => $this->certified_by,
            'notes' => $this->notes,
            'invoice' => new InvoiceResource($this->whenLoaded('invoice')),
            'created_at' => $this->created_at,
        ];
    }
}
