<?php

namespace App\Modules\Billing\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Modules\Billing\Models\Invoice */
class InvoiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'client_id' => $this->client_id,
            'payment_certificate_id' => $this->payment_certificate_id,
            'invoice_no' => $this->invoice_no,
            'invoice_date' => optional($this->invoice_date)?->toDateString(),
            'due_date' => optional($this->due_date)?->toDateString(),
            'currency' => $this->currency,
            'subtotal' => $this->subtotal,
            'tax_amount' => $this->tax_amount,
            'total_amount' => $this->total_amount,
            'amount_paid' => $this->amount_paid,
            'status' => $this->status,
            'notes' => $this->notes,
            'client' => $this->whenLoaded('client', fn () => [
                'id' => $this->client?->id,
                'name' => $this->client?->name,
            ]),
            'payments' => PaymentResource::collection($this->whenLoaded('payments')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
